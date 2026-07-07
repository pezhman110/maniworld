import { Router } from 'express';
import {
  OutreachProspectRegistry,
  OutreachScriptRegistry,
  generateProspectContractPacket,
} from '../../modules/prospectOutreach';
import { AIPersonaRegistry } from '../../modules/project';

/**
 * Prospect outreach pipeline API.
 *
 * Endpoints for the full "search a network for matches against our plan,
 * qualify anyone scoring 80%+, contact them in their own environment,
 * convert their account to an email/phone, contact them directly, invite
 * them to an online consultation, invite them in person with a controlled
 * time slot, hand the list to the responsible person, and send the
 * contract once approved" flow.
 */
export function createProspectOutreachRouter(deps: {
  prospects: OutreachProspectRegistry;
  scripts: OutreachScriptRegistry;
  /** Optional: when provided, an `aiPersonaId` on the online-session invite must reference an already manager-approved persona. */
  personas?: AIPersonaRegistry;
}): Router {
  const router = Router();
  const { prospects, scripts, personas } = deps;

  const handleError = (res: import('express').Response, err: unknown, status = 400) => {
    res.status(status).json({ error: err instanceof Error ? err.message : String(err) });
  };

  router.get('/prospects', (req, res) => {
    const status = req.query.status as string | undefined;
    const planId = req.query.planId as string | undefined;
    if (status) {
      res.json({ prospects: prospects.listByStatus(status as never) });
      return;
    }
    if (planId) {
      res.json({ prospects: prospects.listByPlan(planId) });
      return;
    }
    res.json({ prospects: prospects.all() });
  });

  router.get('/prospects/pending-approval', (_req, res) => {
    res.json({ prospects: prospects.listPendingApproval() });
  });

  router.get('/prospects/:id', (req, res) => {
    const prospect = prospects.get(req.params.id);
    if (!prospect) {
      res.status(404).json({ error: `Prospect "${req.params.id}" not found.` });
      return;
    }
    res.json({ prospect });
  });

  router.post('/prospects', (req, res) => {
    try {
      res.status(201).json({ prospect: prospects.add(req.body ?? {}) });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/prospects/:id/qualify', (req, res) => {
    try {
      res.json({ prospect: prospects.qualify(req.params.id) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/platform-outreach', (req, res) => {
    try {
      res.json({ prospect: prospects.recordPlatformOutreach(req.params.id, req.body?.message ?? '') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/convert-contact', (req, res) => {
    try {
      res.json({ prospect: prospects.convertToContact(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/direct-outreach', (req, res) => {
    try {
      res.json({
        prospect: prospects.recordDirectOutreach(req.params.id, req.body?.channel, req.body?.message ?? ''),
      });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/online-session/invite', (req, res) => {
    const body = req.body ?? {};
    // Hard gate: an AI persona can never host a live session before a manager has approved it.
    if (body.aiPersonaId) {
      if (!personas) {
        res.status(400).json({ error: 'AI persona approval could not be verified: no persona registry configured.' });
        return;
      }
      try {
        personas.assertApproved(body.aiPersonaId);
      } catch (err) {
        handleError(res, err, 400);
        return;
      }
    }
    try {
      res.json({ prospect: prospects.inviteOnlineSession(req.params.id, body) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/online-session/outcome', (req, res) => {
    try {
      res.json({ prospect: prospects.recordOnlineSessionOutcome(req.params.id, req.body?.outcome) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/in-person/invite', (req, res) => {
    try {
      res.json({ prospect: prospects.inviteInPerson(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/in-person/outcome', (req, res) => {
    try {
      res.json({ prospect: prospects.recordInPersonOutcome(req.params.id, req.body?.outcome) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/submit-for-approval', (req, res) => {
    try {
      res.json({ prospect: prospects.submitForApproval(req.params.id, req.body?.responsibleContact ?? '') });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/decide-approval', (req, res) => {
    try {
      res.json({
        prospect: prospects.decideApproval(req.params.id, req.body?.decision, req.body?.decidedBy ?? ''),
      });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/reference-check', (req, res) => {
    try {
      res.json({ prospect: prospects.recordReferenceCheck(req.params.id, req.body ?? {}) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  router.post('/prospects/:id/send-contract', (req, res) => {
    try {
      const prospect = prospects.markContractSent(req.params.id);
      res.json({ prospect, contractText: generateProspectContractPacket(prospect) });
    } catch (err) {
      handleError(res, err, 404);
    }
  });

  // Scripts
  router.get('/scripts/:key', (req, res) => {
    res.json({ script: scripts.getCombinedScript(req.params.key) });
  });
  router.put('/scripts/:key/base', (req, res) => {
    try {
      scripts.setBaseScript(req.params.key, req.body?.text ?? '');
      res.json({ script: scripts.getCombinedScript(req.params.key) });
    } catch (err) {
      handleError(res, err);
    }
  });
  router.post('/scripts/:key/custom-segments', (req, res) => {
    try {
      scripts.addCustomSegment(req.params.key, req.body?.text ?? '');
      res.status(201).json({ script: scripts.getCombinedScript(req.params.key) });
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
