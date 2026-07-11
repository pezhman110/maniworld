import { Router } from 'express';
import { ConsentConversionAcceleratorRegistry } from '../../modules/consentConversionAccelerator';

export function createConsentConversionRouter(deps: { accelerator: ConsentConversionAcceleratorRegistry }): Router {
  const router = Router();
  const { accelerator } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/records', (_req, res) => {
    res.json({ records: accelerator.all() });
  });

  router.get('/records/:id', (req, res) => {
    const record = accelerator.get(req.params.id);
    if (!record) {
      res.status(404).json({ error: `Consent conversion record "${req.params.id}" not found.` });
      return;
    }
    res.json({ record });
  });

  router.post('/records', (req, res) => {
    try {
      res.status(201).json({ record: accelerator.submitAccount(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/records/:id/consent', (req, res) => {
    try {
      res.json({ record: accelerator.recordConsent(req.params.id, req.body?.proof ?? '') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/records/:id/contact', (req, res) => {
    try {
      res.json({ record: accelerator.attachContact(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/final-output', (req, res) => {
    const minQualityScore = req.query.minQualityScore !== undefined ? Number(req.query.minQualityScore) : undefined;
    res.json({ output: accelerator.finalOutput(minQualityScore) });
  });

  return router;
}
