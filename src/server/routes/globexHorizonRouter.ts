import { Router } from 'express';
import { GlobexHorizonRegistry, GlobexTargetGroupId } from '../../modules/globexHorizon';

export function createGlobexHorizonRouter(deps: { globexHorizon: GlobexHorizonRegistry }): Router {
  const router = Router();
  const { globexHorizon } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/mission-pack', (_req, res) => {
    res.json({ missionPack: globexHorizon.getMissionPack() });
  });

  router.get('/targets', (req, res) => {
    res.json({ targets: globexHorizon.listTargets(req.query.groupId as GlobexTargetGroupId | undefined) });
  });

  router.get('/targets/:id', (req, res) => {
    const target = globexHorizon.getTarget(req.params.id);
    if (!target) {
      res.status(404).json({ error: `Globex target "${req.params.id}" not found.` });
      return;
    }
    res.json({ target });
  });

  router.post('/source-evaluation', (req, res) => {
    try {
      res.json({ evaluation: globexHorizon.evaluateSource(String(req.body?.source ?? '')) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/daily-reports', (_req, res) => {
    res.json({ reports: globexHorizon.listDailyReports() });
  });

  router.post('/daily-reports', (req, res) => {
    try {
      res.status(201).json({ report: globexHorizon.recordDailyReport(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/metrics', (_req, res) => {
    res.json({ metrics: globexHorizon.metrics() });
  });

  router.get('/deployment-manifest', (_req, res) => {
    res.json({ manifest: globexHorizon.deploymentManifest() });
  });

  return router;
}
