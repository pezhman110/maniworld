import request from 'supertest';
import { createApp } from '../src/server/app';

describe('duty-scope API', () => {
  function buildApp() {
    return createApp({});
  }

  async function driveProspectToContractSent(app: ReturnType<typeof createApp>, id = 'prospect-1') {
    await request(app).post('/api/outreach/prospects').send({
      id,
      planId: 'plan-1',
      audienceProfileId: 'influencer',
      platform: 'instagram',
      accountHandle: '@jane',
      displayName: 'Jane Doe',
      matchScore: 92,
    });
    await request(app).post(`/api/outreach/prospects/${id}/qualify`);
    await request(app).post(`/api/outreach/prospects/${id}/platform-outreach`).send({ message: 'Hi!' });
    await request(app).post(`/api/outreach/prospects/${id}/convert-contact`).send({ email: 'jane@example.com' });
    await request(app).post(`/api/outreach/prospects/${id}/direct-outreach`).send({ channel: 'email', message: 'Follow up.' });
    await request(app)
      .post(`/api/outreach/prospects/${id}/online-session/invite`)
      .send({ scheduledAt: Date.now(), script: 'script' });
    await request(app).post(`/api/outreach/prospects/${id}/online-session/outcome`).send({ outcome: 'completed' });
    await request(app)
      .post(`/api/outreach/prospects/${id}/in-person/invite`)
      .send({ locationId: 'salon-1', scheduledAt: new Date('2026-01-05T12:00:00').getTime() });
    await request(app).post(`/api/outreach/prospects/${id}/in-person/outcome`).send({ outcome: 'completed' });
    await request(app).post(`/api/outreach/prospects/${id}/submit-for-approval`).send({ responsibleContact: 'mgr@example.com' });
    await request(app).post(`/api/outreach/prospects/${id}/decide-approval`).send({ decision: 'approved', decidedBy: 'boss@example.com' });
    await request(app).post(`/api/outreach/prospects/${id}/send-contract`);
  }

  it('returns 404 defining a duty scope for an unknown prospect', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/duty-scope')
      .send({ prospectId: 'missing', visitsPerPeriod: 2, period: 'day', servicesCovered: [] });
    expect(res.status).toBe(404);
  });

  it('rejects defining a duty scope before the contract has been sent', async () => {
    const app = buildApp();
    await request(app).post('/api/outreach/prospects').send({
      id: 'prospect-2',
      planId: 'plan-1',
      platform: 'instagram',
      accountHandle: '@bob',
      matchScore: 85,
    });
    const res = await request(app)
      .post('/api/duty-scope')
      .send({ prospectId: 'prospect-2', visitsPerPeriod: 2, period: 'day', servicesCovered: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/contract has been sent/);
  });

  it('defines a duty scope, logs check-ins, and reports weekly compliance end-to-end', async () => {
    const app = buildApp();
    await driveProspectToContractSent(app, 'prospect-1');

    const defineRes = await request(app).post('/api/duty-scope').send({
      prospectId: 'prospect-1',
      locationId: 'salon-1',
      visitsPerPeriod: 2,
      period: 'day',
      servicesCovered: ['manicure', 'hair'],
      commissionPercent: 10,
    });
    expect(defineRes.status).toBe(201);
    const dutyScopeId = defineRes.body.dutyScope.id;
    expect(defineRes.body.dutyScope.prospectId).toBe('prospect-1');

    const listRes = await request(app).get('/api/duty-scope').query({ prospectId: 'prospect-1' });
    expect(listRes.status).toBe(200);
    expect(listRes.body.dutyScopes).toHaveLength(1);

    const getRes = await request(app).get(`/api/duty-scope/${dutyScopeId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.dutyScope.id).toBe(dutyScopeId);

    const weekStart = new Date('2026-02-02T00:00:00').getTime();
    for (let day = 0; day < 7; day += 1) {
      const checkInRes = await request(app)
        .post(`/api/duty-scope/${dutyScopeId}/check-in`)
        .send({ checkedInAt: weekStart + day * 24 * 60 * 60 * 1000, locationId: 'salon-1' });
      expect(checkInRes.status).toBe(201);
    }

    const checkInsRes = await request(app).get(`/api/duty-scope/${dutyScopeId}/check-ins`);
    expect(checkInsRes.status).toBe(200);
    expect(checkInsRes.body.checkIns).toHaveLength(7);

    const complianceRes = await request(app)
      .get(`/api/duty-scope/${dutyScopeId}/compliance`)
      .query({ weekStart });
    expect(complianceRes.status).toBe(200);
    expect(complianceRes.body.compliance.expectedVisits).toBe(14);
    expect(complianceRes.body.compliance.actualVisits).toBe(7);
    expect(complianceRes.body.compliance.compliant).toBe(false);
    expect(complianceRes.body.compliance.deficit).toBe(7);

    const overviewRes = await request(app).get('/api/duty-scope/compliance').query({ weekStart });
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.compliance).toHaveLength(1);

    const nonCompliantRes = await request(app)
      .get('/api/duty-scope/compliance')
      .query({ weekStart, nonCompliantOnly: 'true' });
    expect(nonCompliantRes.status).toBe(200);
    expect(nonCompliantRes.body.compliance).toHaveLength(1);

    const deactivateRes = await request(app).post(`/api/duty-scope/${dutyScopeId}/deactivate`);
    expect(deactivateRes.status).toBe(200);
    expect(deactivateRes.body.dutyScope.active).toBe(false);
  });

  it('returns 400 when weekStart query parameter is missing', async () => {
    const app = buildApp();
    const res = await request(app).get('/api/duty-scope/compliance');
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown duty scope', async () => {
    const app = buildApp();
    const getRes = await request(app).get('/api/duty-scope/missing');
    expect(getRes.status).toBe(404);
    const checkInRes = await request(app).post('/api/duty-scope/missing/check-in').send({});
    expect(checkInRes.status).toBe(404);
    const complianceRes = await request(app).get('/api/duty-scope/missing/compliance').query({ weekStart: 0 });
    expect(complianceRes.status).toBe(404);
    const deactivateRes = await request(app).post('/api/duty-scope/missing/deactivate');
    expect(deactivateRes.status).toBe(404);
  });
});
