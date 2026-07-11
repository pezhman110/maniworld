import { Router } from 'express';
import { CompliancePolicyRegistry } from '../../modules/compliancePolicy';

/**
 * Compliance policy API.
 *
 * Lets a manager define, review, and re-confirm the must/must-not rules
 * that gate a given acquisition route (and, separately, how the person
 * conducting online/in-person sessions for that route must behave) -
 * the rules are set once, then explicitly re-confirmed (same or revised)
 * at the start of every later outreach cycle.
 */
export function createCompliancePolicyRouter(deps: { policies: CompliancePolicyRegistry }): Router {
  const router = Router();
  const { policies } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/', (req, res) => {
    const route = req.query.route as string | undefined;
    const scope = req.query.scope as string | undefined;
    if (route) {
      res.json({ policies: policies.listForRoute(route as never, scope as never) });
      return;
    }
    res.json({ policies: policies.list(req.query.onlyActive !== 'false') });
  });

  router.get('/:id', (req, res) => {
    const policy = policies.get(req.params.id);
    if (!policy) {
      res.status(404).json({ error: `Compliance policy "${req.params.id}" not found.` });
      return;
    }
    res.json({ policy });
  });

  router.post('/', (req, res) => {
    try {
      res.status(201).json({ policy: policies.define(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/:id/confirm-same', (req, res) => {
    try {
      res.json({ policy: policies.confirmSame(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/revise-rules', (req, res) => {
    try {
      res.json({ policy: policies.reviseRules(req.params.id, req.body?.rules ?? []) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/rules', (req, res) => {
    try {
      res.status(201).json({ policy: policies.addRule(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.delete('/:id/rules/:ruleId', (req, res) => {
    try {
      res.json({ policy: policies.removeRule(req.params.id, req.params.ruleId) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/:id/needs-reconfirmation', (req, res) => {
    try {
      const cycleMs = Number(req.query.cycleMs ?? 0);
      res.json({ needsReconfirmation: policies.needsReconfirmation(req.params.id, cycleMs) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.delete('/:id', (req, res) => {
    const removed = policies.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Compliance policy "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  return router;
}
