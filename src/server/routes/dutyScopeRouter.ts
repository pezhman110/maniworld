import { Router } from 'express';
import { DutyScopeRegistry } from '../../modules/dutyScope';
import { OutreachProspectRegistry } from '../../modules/prospectOutreach';

/**
 * Post-contract duty-scope API.
 *
 * Once a prospect's contract has been sent, a manager defines the concrete
 * post-contract job description here (e.g. "2 visits/day"), actual visits
 * get logged as check-ins, and weekly compliance can be pulled for the
 * monitoring dashboard.
 */
export function createDutyScopeRouter(deps: { dutyScopes: DutyScopeRegistry; prospects: OutreachProspectRegistry }): Router {
  const router = Router();
  const { dutyScopes, prospects } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/', (req, res) => {
    const prospectId = req.query.prospectId as string | undefined;
    res.json({ dutyScopes: prospectId ? dutyScopes.listByProspect(prospectId) : dutyScopes.all() });
  });

  router.get('/compliance', (req, res) => {
    const weekStart = Number(req.query.weekStart);
    if (!Number.isFinite(weekStart)) {
      res.status(400).json({ error: '"weekStart" query parameter (timestamp) is required.' });
      return;
    }
    const nonCompliantOnly = req.query.nonCompliantOnly === 'true';
    res.json({
      compliance: nonCompliantOnly ? dutyScopes.listNonCompliant(weekStart) : dutyScopes.listWeeklyCompliance(weekStart),
    });
  });

  router.get('/:id', (req, res) => {
    const scope = dutyScopes.get(req.params.id);
    if (!scope) {
      res.status(404).json({ error: `Duty scope "${req.params.id}" not found.` });
      return;
    }
    res.json({ dutyScope: scope });
  });

  router.post('/', (req, res) => {
    try {
      const prospectId = req.body?.prospectId;
      const prospect = prospects.get(prospectId);
      if (!prospect) {
        res.status(404).json({ error: `Prospect "${prospectId}" not found.` });
        return;
      }
      const dutyScope = dutyScopes.define(prospect, req.body ?? {});
      res.status(201).json({ dutyScope });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/:id/check-in', (req, res) => {
    try {
      const checkedInAt = req.body?.checkedInAt ? Number(req.body.checkedInAt) : Date.now();
      const checkIn = dutyScopes.recordCheckIn(req.params.id, checkedInAt, {
        locationId: req.body?.locationId,
        notes: req.body?.notes,
      });
      res.status(201).json({ checkIn });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/:id/check-ins', (req, res) => {
    if (!dutyScopes.get(req.params.id)) {
      res.status(404).json({ error: `Duty scope "${req.params.id}" not found.` });
      return;
    }
    res.json({ checkIns: dutyScopes.listCheckIns(req.params.id) });
  });

  router.get('/:id/compliance', (req, res) => {
    const weekStart = Number(req.query.weekStart);
    if (!Number.isFinite(weekStart)) {
      res.status(400).json({ error: '"weekStart" query parameter (timestamp) is required.' });
      return;
    }
    try {
      res.json({ compliance: dutyScopes.computeWeeklyCompliance(req.params.id, weekStart) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/deactivate', (req, res) => {
    try {
      res.json({ dutyScope: dutyScopes.deactivate(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  return router;
}
