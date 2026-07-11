import { Router } from 'express';
import { AIPersonaRegistry, ProjectRegistry, ALL_AUDIENCE_ROUTES } from '../../modules/project';

/**
 * Project (step 0) API.
 *
 * The very first step of the pipeline: an external client enters the
 * project's information and names it. This exposes:
 *  - creating/reading projects, each always carrying all three acquisition
 *    routes (direct-network / job-posting / resume-intake);
 *  - switching a route on/off;
 *  - linking the project to the `AudienceProfile` group created for it;
 *  - requesting an AI persona to host online sessions for the project, and
 *    the separate manager decision that must approve it before use.
 */
export function createProjectRouter(deps: { projects: ProjectRegistry; personas: AIPersonaRegistry }): Router {
  const router = Router();
  const { projects, personas } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/', (_req, res) => {
    res.json({ projects: projects.all(), routes: ALL_AUDIENCE_ROUTES });
  });

  router.get('/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) {
      res.status(404).json({ error: `Project "${req.params.id}" not found.` });
      return;
    }
    res.json({ project });
  });

  router.post('/', (req, res) => {
    try {
      res.status(201).json({ project: projects.create(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.put('/:id/goals', (req, res) => {
    try {
      res.json({ project: projects.updateGoals(req.params.id, req.body?.goals ?? []) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/audience-profile', (req, res) => {
    try {
      res.json({ project: projects.linkAudienceProfile(req.params.id, req.body?.audienceProfileId ?? '') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/routes/:route/activate', (req, res) => {
    try {
      res.json({ project: projects.activateRoute(req.params.id, req.params.route as never) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/:id/routes/:route/deactivate', (req, res) => {
    try {
      res.json({ project: projects.deactivateRoute(req.params.id, req.params.route as never) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  // AI personas
  router.get('/:id/ai-personas', (req, res) => {
    res.json({ personas: personas.listByProject(req.params.id) });
  });

  router.post('/:id/ai-personas', (req, res) => {
    try {
      res.status(201).json({ persona: personas.request({ ...(req.body ?? {}), projectId: req.params.id }) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/ai-personas/pending-approval', (_req, res) => {
    res.json({ personas: personas.listPendingApproval() });
  });

  router.post('/ai-personas/:personaId/decision', (req, res) => {
    try {
      res.json({
        persona: personas.decide(req.params.personaId, req.body?.decision, req.body?.decidedBy ?? ''),
      });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  return router;
}
