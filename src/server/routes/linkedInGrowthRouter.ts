import { Router } from 'express';
import { LinkedInLegalGrowthRegistry, LinkedInLeadStage } from '../../modules/linkedInLegalGrowth';

export function createLinkedInGrowthRouter(deps: { linkedInGrowth: LinkedInLegalGrowthRegistry }): Router {
  const router = Router();
  const { linkedInGrowth } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/leads', (req, res) => {
    const stage = req.query.stage as LinkedInLeadStage | undefined;
    const leads = linkedInGrowth.all().filter((lead) => !stage || lead.stage === stage);
    res.json({ leads });
  });

  router.post('/leads', (req, res) => {
    try {
      res.status(201).json({ lead: linkedInGrowth.addLead(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/leads/:id', (req, res) => {
    const lead = linkedInGrowth.get(req.params.id);
    if (!lead) {
      res.status(404).json({ error: `LinkedIn lead "${req.params.id}" not found.` });
      return;
    }
    res.json({ lead });
  });

  router.post('/leads/:id/classify', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.classify(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/score', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.score(req.params.id, req.body?.score, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/contact-points', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.addContactPoint(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/legal-path', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.selectLegalPath(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/connection-accepted', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.recordConnectionAccepted(req.params.id, req.body?.proof ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/response', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.recordResponse(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/lead-gen-form', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.submitLeadGenForm(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/meeting-ready', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.markMeetingReady(req.params.id, req.body?.meetingLink ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/deal-room', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.moveToDealRoom(req.params.id, req.body?.dealRoomId ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/opt-out', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.recordOptOut(req.params.id, req.body?.proof ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/archive', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.archive(req.params.id, req.body?.reason ?? '', req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/leads/:id/eligibility', (req, res) => {
    try {
      res.json({ eligibility: linkedInGrowth.evaluateEligibility(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/assign-seller', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.assignSeller(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/leads/:id/seller-actions', (req, res) => {
    try {
      res.json({ lead: linkedInGrowth.recordSellerAction(req.params.id, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/assignments', (req, res) => {
    res.json({ assignments: linkedInGrowth.listAssignments(req.query.seller as string | undefined) });
  });

  router.get('/workbench/:seller', (req, res) => {
    res.json({ workbench: linkedInGrowth.buildWorkbench(req.params.seller) });
  });

  router.get('/tools', (_req, res) => {
    res.json({ tools: linkedInGrowth.listTools() });
  });

  router.patch('/tools/:name', (req, res) => {
    try {
      res.json({ tool: linkedInGrowth.updateTool(req.params.name, req.body ?? {}, req.body?.actor) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.get('/metrics', (_req, res) => {
    res.json({ metrics: linkedInGrowth.metrics() });
  });

  return router;
}
