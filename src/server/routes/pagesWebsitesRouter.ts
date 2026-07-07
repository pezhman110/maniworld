import { Router } from 'express';
import { Locale } from '../../types/domain';
import { PagesWebsitesRegistry, PageStatus } from '../../modules/pagesWebsites';

export function createPagesWebsitesRouter(pagesWebsites: PagesWebsitesRegistry): Router {
  const router = Router();
  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/catalog', (_req, res) => {
    res.json({
      options: pagesWebsites.listOptions(),
      brandKits: pagesWebsites.listBrandKits(),
      templates: pagesWebsites.listTemplates(),
      blocks: pagesWebsites.listBlocks(),
    });
  });

  router.get('/pages', async (req, res) => {
    res.json({ pages: await pagesWebsites.list(req.query.status as PageStatus | undefined) });
  });

  router.post('/pages', async (req, res) => {
    try {
      res.status(201).json({ page: await pagesWebsites.createPage(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/pages/:id', async (req, res) => {
    const page = await pagesWebsites.get(req.params.id);
    if (!page) {
      res.status(404).json({ error: `Page "${req.params.id}" not found.` });
      return;
    }
    res.json({ page });
  });

  router.put('/pages/:id', async (req, res) => {
    try {
      res.json({ page: await pagesWebsites.updatePage(req.params.id, req.body ?? {}, req.body?.changedBy ?? 'dashboard') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/pages/:id/quality-score', async (req, res) => {
    try {
      res.json({ qualityScore: await pagesWebsites.calculateQualityScore(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/pages/:id/approval-requests', async (req, res) => {
    try {
      res.status(201).json({ approvalRequest: await pagesWebsites.requestApproval(req.params.id, req.body?.requestedBy ?? 'dashboard') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/pages/:id/approval-requests', async (req, res) => {
    res.json({ approvalRequests: await pagesWebsites.listApprovals(req.params.id) });
  });

  router.post('/approval-requests/:requestId/decision', async (req, res) => {
    try {
      res.json({ approvalRequest: await pagesWebsites.decideApproval(req.params.requestId, req.body?.decision, req.body?.decidedBy, req.body?.note) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/pages/:id/publish', async (req, res) => {
    try {
      res.json({ page: await pagesWebsites.publish(req.params.id, req.body?.actor ?? 'dashboard') });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/pages/:id/status/:status', async (req, res) => {
    try {
      res.json({ page: await pagesWebsites.setStatus(req.params.id, req.params.status as never, req.body?.actor ?? 'dashboard') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/pages/:id/variants', async (req, res) => {
    try {
      res.status(201).json({ variant: await pagesWebsites.addVariant(req.params.id, req.body?.label, req.body?.headline) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/pages/:id/variants/:variantId/winner', async (req, res) => {
    try {
      res.json({ variant: await pagesWebsites.markWinningVariant(req.params.id, req.params.variantId) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/pages/:id/submissions', async (req, res) => {
    res.json({ submissions: await pagesWebsites.listSubmissions(req.params.id) });
  });

  router.get('/pages/:id/referrals', async (req, res) => {
    res.json({ referralLinks: await pagesWebsites.listReferrals(req.params.id) });
  });

  router.post('/pages/:id/referrals', async (req, res) => {
    try {
      res.status(201).json({ referralLink: await pagesWebsites.createReferralLink({ ...req.body, pageId: req.params.id }) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/imports', async (req, res) => {
    res.json({ imports: await pagesWebsites.listImports(req.query.pageId as string | undefined) });
  });

  router.post('/imports/file', async (req, res) => {
    try {
      res.status(201).json({ import: await pagesWebsites.recordImport({ ...(req.body ?? {}), kind: 'file' }) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/imports/voice', async (req, res) => {
    try {
      res.status(201).json({ import: await pagesWebsites.recordImport({ ...(req.body ?? {}), kind: 'voice' }) });
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}

export function createPublicPagesRouter(pagesWebsites: PagesWebsitesRegistry): Router {
  const router = Router();
  const handleError = (res: import('express').Response, err: unknown, status = 404) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/page/:slug', async (req, res) => {
    try {
      const language = (req.query.language as Locale | undefined) ?? 'en';
      await pagesWebsites.trackView(req.params.slug, {
        visitorId: req.query.visitorId as string | undefined,
        variantId: req.query.variantId as string | undefined,
        source: req.query.source as string | undefined,
        referralCode: req.query.referralCode as string | undefined,
        language,
      });
      res.type('html').send(await pagesWebsites.renderPublicPage(req.params.slug, language));
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/page/:slug/form-start', async (req, res) => {
    try {
      res.json({ page: await pagesWebsites.trackFormStart(req.params.slug) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/page/:slug/submissions', async (req, res) => {
    try {
      res.status(201).json({ submission: await pagesWebsites.submit(req.params.slug, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 400);
    }
  });

  return router;
}
