import { Router } from 'express';
import { InvestorAcquisitionRegistry, InvestorToolCategory } from '../../modules/investorAcquisition';

export function createInvestorAcquisitionRouter(deps: { investorAcquisition: InvestorAcquisitionRegistry }): Router {
  const router = Router();
  const { investorAcquisition } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/tools', (req, res) => {
    res.json({ tools: investorAcquisition.listTools(req.query.category as InvestorToolCategory | undefined) });
  });

  router.post('/signals/evaluate', (req, res) => {
    try {
      res.json({ evaluation: investorAcquisition.evaluateSignal(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/leads', (_req, res) => {
    res.json({ leads: investorAcquisition.listLeads() });
  });

  router.get('/leads/:id', (req, res) => {
    const lead = investorAcquisition.getLead(req.params.id);
    if (!lead) {
      res.status(404).json({ error: `Investor lead "${req.params.id}" not found.` });
      return;
    }
    res.json({ lead });
  });

  router.post('/leads', (req, res) => {
    try {
      res.status(201).json({ lead: investorAcquisition.registerLead(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/playbooks', (_req, res) => {
    res.json({ playbooks: investorAcquisition.listPlaybooks() });
  });

  router.post('/playbooks', (req, res) => {
    try {
      res.status(201).json({ playbook: investorAcquisition.createPlaybook(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/metrics', (_req, res) => {
    res.json({ metrics: investorAcquisition.metrics() });
  });

  return router;
}
