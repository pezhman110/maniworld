import { Router } from 'express';
import { IntegrationCredentialsStore, IntegrationProvider } from '../../modules/credentialsStore';
import { ConnectionTester } from '../connectionTest';

const VALID_PROVIDERS: readonly IntegrationProvider[] = [
  'twilio',
  'whatsapp',
  'telegram',
  'vapi',
  'zoom',
  'google-meet',
  'apollo',
];

function isValidProvider(value: string): value is IntegrationProvider {
  return (VALID_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Connections page API: lets a manager wire up every outreach integration
 * (Twilio, WhatsApp, Telegram, Vapi, Zoom, Google Meet, Apollo) from the
 * dashboard -- add/edit/remove credentials and see their connection status,
 * without ever exposing the stored secret values back to the browser.
 */
export function createCredentialsRouter(store: IntegrationCredentialsStore, testConnection: ConnectionTester): Router {
  const router = Router();

  router.get('/providers', (_req, res) => {
    res.json({ providers: VALID_PROVIDERS });
  });

  router.get('/', async (_req, res) => {
    res.json({ credentials: await store.list() });
  });

  router.get('/:provider', async (req, res) => {
    if (!isValidProvider(req.params.provider)) {
      res.status(400).json({ error: `Unknown provider "${req.params.provider}".` });
      return;
    }
    const summary = await store.getSummary(req.params.provider);
    if (!summary) {
      res.status(404).json({ error: `No credentials configured for provider "${req.params.provider}".` });
      return;
    }
    res.json({ credential: summary });
  });

  router.put('/:provider', async (req, res) => {
    if (!isValidProvider(req.params.provider)) {
      res.status(400).json({ error: `Unknown provider "${req.params.provider}".` });
      return;
    }
    const { label, fields } = req.body ?? {};
    if (typeof label !== 'string' || !label.trim()) {
      res.status(400).json({ error: '"label" is required.' });
      return;
    }
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      res.status(400).json({ error: '"fields" must be an object of credential field values.' });
      return;
    }
    const summary = await store.set(req.params.provider, label, fields);
    res.status(201).json({ credential: summary });
  });

  router.post('/:provider/test', async (req, res) => {
    if (!isValidProvider(req.params.provider)) {
      res.status(400).json({ error: `Unknown provider "${req.params.provider}".` });
      return;
    }
    const fields = await store.get(req.params.provider);
    if (!fields) {
      res.status(404).json({ error: `No credentials configured for provider "${req.params.provider}".` });
      return;
    }
    const result = await testConnection(req.params.provider, fields);
    const summary = await store.markStatus(req.params.provider, result.ok ? 'connected' : 'invalid');
    res.json({ result, credential: summary });
  });

  router.delete('/:provider', async (req, res) => {
    if (!isValidProvider(req.params.provider)) {
      res.status(400).json({ error: `Unknown provider "${req.params.provider}".` });
      return;
    }
    const removed = await store.remove(req.params.provider);
    if (!removed) {
      res.status(404).json({ error: `No credentials configured for provider "${req.params.provider}".` });
      return;
    }
    res.status(204).send();
  });

  return router;
}
