import request from 'supertest';
import { createApp } from '../src/server/app';
import { IntegrationCredentialsStore } from '../src/modules/credentialsStore';
import { MarketRegistry } from '../src/modules/marketRegistry';

describe('admin API app', () => {
  const testKey = Buffer.alloc(32, 3);

  function buildApp(adminApiKey?: string) {
    const credentialsStore = new IntegrationCredentialsStore(undefined, testKey);
    const marketRegistry = new MarketRegistry();
    const testConnection = jest.fn().mockResolvedValue({ ok: true, message: 'ok' });
    const app = createApp({ credentialsStore, marketRegistry, testConnection, adminApiKey });
    return { app, credentialsStore, marketRegistry, testConnection };
  }

  it('GET /health is public and returns ok', async () => {
    const { app } = buildApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /api/i18n is public and returns the en/fa/ar translation dictionary', async () => {
    const { app } = buildApp('secret-key');
    const res = await request(app).get('/api/i18n');
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.translations)).toEqual(expect.arrayContaining(['en', 'fa', 'ar']));
    expect(res.body.translations.en['dashboard.title']).toBeDefined();
  });

  it('redirects GET / to the entrance page when the dashboard is served', async () => {
    const credentialsStore = new IntegrationCredentialsStore(undefined, testKey);
    const marketRegistry = new MarketRegistry();
    const app = createApp({ credentialsStore, marketRegistry, serveDashboard: true });
    const res = await request(app).get('/');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/entrance/');
  });

  it('rejects API requests without a valid x-api-key when one is configured', async () => {
    const { app } = buildApp('secret-key');
    const res = await request(app).get('/api/credentials');
    expect(res.status).toBe(401);
  });

  it('allows API requests with the correct x-api-key', async () => {
    const { app } = buildApp('secret-key');
    const res = await request(app).get('/api/credentials').set('x-api-key', 'secret-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ credentials: [] });
  });

  describe('credentials routes', () => {
    it('creates, lists, tests and deletes a credential', async () => {
      const { app, testConnection } = buildApp();

      const putRes = await request(app)
        .put('/api/credentials/twilio')
        .send({ label: 'Prod Twilio', fields: { accountSid: 'AC123', authToken: 'secret' } });
      expect(putRes.status).toBe(201);
      expect(putRes.body.credential.status).toBe('unverified');
      expect(JSON.stringify(putRes.body)).not.toContain('secret');

      const listRes = await request(app).get('/api/credentials');
      expect(listRes.body.credentials).toHaveLength(1);

      const testRes = await request(app).post('/api/credentials/twilio/test');
      expect(testRes.status).toBe(200);
      expect(testRes.body.credential.status).toBe('connected');
      expect(testConnection).toHaveBeenCalledWith('twilio', { accountSid: 'AC123', authToken: 'secret' });

      const deleteRes = await request(app).delete('/api/credentials/twilio');
      expect(deleteRes.status).toBe(204);

      const getRes = await request(app).get('/api/credentials/twilio');
      expect(getRes.status).toBe(404);
    });

    it('rejects an unknown provider', async () => {
      const { app } = buildApp();
      const res = await request(app)
        .put('/api/credentials/not-a-provider')
        .send({ label: 'x', fields: {} });
      expect(res.status).toBe(400);
    });

    it('rejects a missing label or fields', async () => {
      const { app } = buildApp();
      const res1 = await request(app).put('/api/credentials/twilio').send({ fields: {} });
      expect(res1.status).toBe(400);
      const res2 = await request(app).put('/api/credentials/twilio').send({ label: 'x' });
      expect(res2.status).toBe(400);
    });
  });

  describe('markets routes', () => {
    it('lists the built-in markets read-only reference', async () => {
      const { app } = buildApp();
      const res = await request(app).get('/api/markets/built-in');
      expect(res.status).toBe(200);
      expect(res.body.markets.some((m: { id: string }) => m.id === 'salon-women')).toBe(true);
    });

    it('creates, updates, computes pacing for, and deletes a custom market', async () => {
      const { app } = buildApp();

      const createRes = await request(app).post('/api/markets').send({
        id: 'franchise-expansion',
        label: 'Franchise Expansion',
        workingHours: { startHour: 9, endHour: 18 },
        targetRules: [{ metric: 'online-session', minPerDay: 20, maxPerDay: 30 }],
      });
      expect(createRes.status).toBe(201);

      const pacingRes = await request(app)
        .get('/api/markets/franchise-expansion/pacing')
        .query({ metric: 'online-session', achievedSoFar: 5, currentHour: 12 });
      expect(pacingRes.status).toBe(200);
      expect(pacingRes.body.report.minPerDay).toBe(20);

      const updateRes = await request(app).put('/api/markets/franchise-expansion').send({ active: false });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.market.active).toBe(false);

      const deleteRes = await request(app).delete('/api/markets/franchise-expansion');
      expect(deleteRes.status).toBe(204);
    });

    it('rejects creating a market with a built-in id', async () => {
      const { app } = buildApp();
      const res = await request(app).post('/api/markets').send({
        id: 'salon-women',
        label: 'x',
        workingHours: { startHour: 9, endHour: 18 },
        targetRules: [{ metric: 'confirmed-booking', minPerDay: 10 }],
      });
      expect(res.status).toBe(400);
    });
  });
});
