import { Router } from 'express';
import {
  AudienceProfileRegistry,
  CommissionModelRegistry,
  LandingPageRegistry,
  ResumeIntakeRegistry,
} from '../../modules/presentationCampaigns';

/**
 * Presentation & online-consultation campaigns page API.
 *
 * A single, self-contained set of endpoints so a manager can, from one
 * dashboard page: define/edit an audience profile (target text + goals,
 * e.g. influencer/company/group/bank — changing the audience changes the
 * goals), define/edit the commission/collaboration model tied to that
 * audience or vertical, record where a candidate's resume came from
 * (Indeed/LinkedIn/manual link/upload), and define a single-page landing
 * site (slug, optional custom domain, hero text, freely-added content
 * blocks, and the lead-capture fields it should collect).
 */
export function createPresentationRouter(deps: {
  audienceProfiles: AudienceProfileRegistry;
  commissionModels: CommissionModelRegistry;
  resumeIntakes: ResumeIntakeRegistry;
  landingPages: LandingPageRegistry;
}): Router {
  const router = Router();
  const { audienceProfiles, commissionModels, resumeIntakes, landingPages } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  // Audience profiles
  router.get('/audience-profiles', async (req, res) => {
    res.json({ audienceProfiles: await audienceProfiles.list(req.query.onlyActive !== 'false') });
  });
  router.post('/audience-profiles', async (req, res) => {
    try {
      res.status(201).json({ audienceProfile: await audienceProfiles.create(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });
  router.put('/audience-profiles/:id', async (req, res) => {
    try {
      res.json({ audienceProfile: await audienceProfiles.update(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });
  router.delete('/audience-profiles/:id', async (req, res) => {
    const removed = await audienceProfiles.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Audience profile "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  // Commission models
  router.get('/commission-models', async (req, res) => {
    const audienceProfileId = req.query.audienceProfileId as string | undefined;
    const models = audienceProfileId
      ? await commissionModels.listForAudienceProfile(audienceProfileId)
      : await commissionModels.list(req.query.onlyActive !== 'false');
    res.json({ commissionModels: models });
  });
  router.post('/commission-models', async (req, res) => {
    try {
      res.status(201).json({ commissionModel: await commissionModels.create(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });
  router.put('/commission-models/:id', async (req, res) => {
    try {
      res.json({ commissionModel: await commissionModels.update(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });
  router.delete('/commission-models/:id', async (req, res) => {
    const removed = await commissionModels.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Commission model "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  // Resume intakes
  router.get('/resumes', async (_req, res) => {
    res.json({ resumes: await resumeIntakes.list() });
  });
  router.post('/resumes', async (req, res) => {
    try {
      res.status(201).json({ resume: await resumeIntakes.record(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });
  router.delete('/resumes/:id', async (req, res) => {
    const removed = await resumeIntakes.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Resume "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  // Landing pages (single-page sites)
  router.get('/landing-pages', async (req, res) => {
    res.json({ landingPages: await landingPages.list(req.query.onlyActive !== 'false') });
  });
  router.get('/landing-pages/by-slug/:slug', async (req, res) => {
    const site = await landingPages.getBySlug(req.params.slug);
    if (!site) {
      res.status(404).json({ error: `Landing page with slug "${req.params.slug}" not found.` });
      return;
    }
    res.json({ landingPage: site });
  });
  router.post('/landing-pages', async (req, res) => {
    try {
      res.status(201).json({ landingPage: await landingPages.create(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });
  router.put('/landing-pages/:id', async (req, res) => {
    try {
      res.json({ landingPage: await landingPages.update(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });
  router.post('/landing-pages/:id/content-blocks', async (req, res) => {
    try {
      res.status(201).json({ landingPage: await landingPages.addContentBlock(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });
  router.delete('/landing-pages/:id', async (req, res) => {
    const removed = await landingPages.remove(req.params.id);
    if (!removed) {
      res.status(404).json({ error: `Landing page "${req.params.id}" not found.` });
      return;
    }
    res.status(204).send();
  });

  return router;
}
