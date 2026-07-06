import request from 'supertest';
import { createApp } from '../src/server/app';

describe('prospect outreach API', () => {
  function buildApp() {
    return createApp({});
  }

  it('drives a prospect end-to-end via the API: source -> qualify -> ... -> contract sent', async () => {
    const app = buildApp();

    const addRes = await request(app).post('/api/outreach/prospects').send({
      id: 'prospect-1',
      planId: 'plan-1',
      audienceProfileId: 'influencer',
      platform: 'instagram',
      accountHandle: '@jane',
      displayName: 'Jane Doe',
      matchScore: 92,
    });
    expect(addRes.status).toBe(201);
    expect(addRes.body.prospect.status).toBe('sourced');

    const qualifyRes = await request(app).post('/api/outreach/prospects/prospect-1/qualify');
    expect(qualifyRes.status).toBe(200);
    expect(qualifyRes.body.prospect.status).toBe('qualified');

    const platformRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/platform-outreach')
      .send({ message: 'Hi Jane, loved your latest reel!' });
    expect(platformRes.status).toBe(200);
    expect(platformRes.body.prospect.status).toBe('platform-contacted');

    const convertRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/convert-contact')
      .send({ email: 'jane@example.com', phone: '+989120000000' });
    expect(convertRes.status).toBe(200);
    expect(convertRes.body.prospect.status).toBe('contact-converted');

    const directRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/direct-outreach')
      .send({ channel: 'email', message: 'Following up from Instagram.' });
    expect(directRes.status).toBe(200);
    expect(directRes.body.prospect.status).toBe('direct-contacted');

    const onlineInviteRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/online-session/invite')
      .send({ scheduledAt: new Date('2026-01-01T10:00:00').getTime(), script: 'Combined script text' });
    expect(onlineInviteRes.status).toBe(200);
    expect(onlineInviteRes.body.prospect.status).toBe('online-invited');

    const onlineOutcomeRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/online-session/outcome')
      .send({ outcome: 'completed' });
    expect(onlineOutcomeRes.status).toBe(200);
    expect(onlineOutcomeRes.body.prospect.status).toBe('online-completed');

    const inPersonInviteRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/in-person/invite')
      .send({ locationId: 'salon-1', scheduledAt: new Date('2026-01-02T14:00:00').getTime() });
    expect(inPersonInviteRes.status).toBe(200);
    expect(inPersonInviteRes.body.prospect.status).toBe('in-person-invited');

    const inPersonOutcomeRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/in-person/outcome')
      .send({ outcome: 'completed' });
    expect(inPersonOutcomeRes.status).toBe(200);
    expect(inPersonOutcomeRes.body.prospect.status).toBe('in-person-completed');

    const submitRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/submit-for-approval')
      .send({ responsibleContact: 'manager@example.com' });
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.prospect.status).toBe('pending-approval');

    const pendingRes = await request(app).get('/api/outreach/prospects/pending-approval');
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.prospects).toHaveLength(1);

    const approveRes = await request(app)
      .post('/api/outreach/prospects/prospect-1/decide-approval')
      .send({ decision: 'approved', decidedBy: 'boss@example.com' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.prospect.status).toBe('approved');

    const contractRes = await request(app).post('/api/outreach/prospects/prospect-1/send-contract');
    expect(contractRes.status).toBe(200);
    expect(contractRes.body.prospect.status).toBe('contract-sent');
    expect(contractRes.body.contractText).toContain('Jane Doe');
  });

  it('returns 404 for an unknown prospect', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/outreach/prospects/missing/qualify');
    expect(res.status).toBe(404);
  });

  it('sets and combines outreach scripts by key', async () => {
    const app = buildApp();

    const baseRes = await request(app)
      .put('/api/outreach/scripts/influencer/base')
      .send({ text: 'Default influencer pitch.' });
    expect(baseRes.status).toBe(200);

    const customRes = await request(app)
      .post('/api/outreach/scripts/influencer/custom-segments')
      .send({ text: 'Mention the spring campaign.' });
    expect(customRes.status).toBe(201);
    expect(customRes.body.script).toContain('Default influencer pitch');
    expect(customRes.body.script).toContain('spring campaign');

    const getRes = await request(app).get('/api/outreach/scripts/influencer');
    expect(getRes.status).toBe(200);
    expect(getRes.body.script).toContain('spring campaign');
  });
});
