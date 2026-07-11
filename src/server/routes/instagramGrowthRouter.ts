import { Router } from 'express';
import { InstagramLegalGrowthRegistry } from '../../modules/instagramLegalGrowth';
import { InstagramGrowthStage, SellerHandoffStatus } from '../../types/domain';

export function createInstagramGrowthRouter(deps: { instagramGrowth: InstagramLegalGrowthRegistry }): Router {
  const router = Router();
  const { instagramGrowth } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/accounts', (req, res) => {
    const stage = req.query.stage as InstagramGrowthStage | undefined;
    res.json({ accounts: stage ? instagramGrowth.listByStage(stage) : instagramGrowth.all() });
  });

  router.get('/accounts/:id', (req, res) => {
    const account = instagramGrowth.get(req.params.id);
    if (!account) {
      res.status(404).json({ error: `Instagram growth account "${req.params.id}" not found.` });
      return;
    }
    res.json({ account });
  });

  router.post('/accounts', (req, res) => {
    try {
      res.status(201).json({ account: instagramGrowth.addAccount(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/accounts/:id/classify', (req, res) => {
    try {
      res.json({ account: instagramGrowth.classify(req.params.id, req.body?.accountType, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/signals', (req, res) => {
    try {
      res.json({ account: instagramGrowth.collectPublicSignals(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/contacts', (req, res) => {
    try {
      res.json({ account: instagramGrowth.addContact(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/warmup', (req, res) => {
    try {
      res.json({ account: instagramGrowth.recordWarmupPath(req.params.id, req.body?.path, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/permission/prepare', (req, res) => {
    try {
      res.json({ account: instagramGrowth.preparePermissionMessage(req.params.id, req.body?.script ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/permission/send', (req, res) => {
    try {
      res.json({ account: instagramGrowth.sendPermissionMessage(req.params.id, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/reply', (req, res) => {
    try {
      res.json({ account: instagramGrowth.recordReply(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/convert-contact', (req, res) => {
    try {
      res.json({ account: instagramGrowth.convertContactAfterConsent(req.params.id, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/booking-ready', (req, res) => {
    try {
      res.json({ account: instagramGrowth.markBookingReady(req.params.id, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/opt-out', (req, res) => {
    try {
      res.json({ account: instagramGrowth.recordOptOut(req.params.id, req.body?.proof ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/archive', (req, res) => {
    try {
      res.json({ account: instagramGrowth.archive(req.params.id, req.body?.reason ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/accounts/:id/eligibility', (req, res) => {
    try {
      res.json({ eligibility: instagramGrowth.evaluateEligibility(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/handoff', (req, res) => {
    try {
      res.json({ account: instagramGrowth.enqueueSellerHandoff(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/accounts/:id/handoff/actions', (req, res) => {
    try {
      res.json({ account: instagramGrowth.recordSellerAction(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/handoffs', (req, res) => {
    res.json({ handoffs: instagramGrowth.listSellerHandoffs(req.query.status as SellerHandoffStatus | undefined) });
  });

  router.get('/seller-actions', (req, res) => {
    res.json({ actions: instagramGrowth.listSellerActions(req.query.accountId as string | undefined) });
  });

  router.get('/archive', (_req, res) => {
    res.json({ accounts: instagramGrowth.listArchive() });
  });

  router.get('/metrics', (_req, res) => {
    res.json({ metrics: instagramGrowth.metrics() });
  });

  return router;
}
