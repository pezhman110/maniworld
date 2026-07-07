import request from 'supertest';
import { createApp } from '../src/server/app';

describe('compliance policy API', () => {
  function buildApp() {
    return createApp({});
  }

  it('defines, lists, confirms-same, revises, and deletes a policy end-to-end', async () => {
    const app = buildApp();

    const defineRes = await request(app)
      .post('/api/compliance-policy')
      .send({
        id: 'policy-direct-network',
        scope: 'route',
        route: 'direct-network',
        rules: [
          { id: 'must-real-account', kind: 'must', text: "Use the person's own real account." },
          { id: 'must-not-fake-account', kind: 'must-not', text: 'Never create/purchase fake accounts.' },
        ],
      });
    expect(defineRes.status).toBe(201);
    expect(defineRes.body.policy.version).toBe(1);

    const getRes = await request(app).get('/api/compliance-policy/policy-direct-network');
    expect(getRes.status).toBe(200);
    expect(getRes.body.policy.rules).toHaveLength(2);

    const listRes = await request(app).get('/api/compliance-policy?route=direct-network');
    expect(listRes.status).toBe(200);
    expect(listRes.body.policies).toHaveLength(1);

    const confirmRes = await request(app).post('/api/compliance-policy/policy-direct-network/confirm-same');
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.policy.version).toBe(1);

    const reviseRes = await request(app)
      .post('/api/compliance-policy/policy-direct-network/revise-rules')
      .send({
        rules: [
          { id: 'must-real-account', kind: 'must', text: "Use the person's own real account." },
          {
            id: 'must-reference-check',
            kind: 'must',
            text: 'Contact the previous employer before an offer.',
          },
        ],
      });
    expect(reviseRes.status).toBe(200);
    expect(reviseRes.body.policy.version).toBe(2);

    const addRuleRes = await request(app)
      .post('/api/compliance-policy/policy-direct-network/rules')
      .send({ id: 'must-not-scripted-posting', kind: 'must-not', text: 'No scripted auto-posting.' });
    expect(addRuleRes.status).toBe(201);
    expect(addRuleRes.body.policy.rules).toHaveLength(3);

    const removeRuleRes = await request(app).delete(
      '/api/compliance-policy/policy-direct-network/rules/must-not-scripted-posting'
    );
    expect(removeRuleRes.status).toBe(200);
    expect(removeRuleRes.body.policy.rules).toHaveLength(2);

    const needsReconfirmRes = await request(app).get(
      '/api/compliance-policy/policy-direct-network/needs-reconfirmation?cycleMs=1'
    );
    expect(needsReconfirmRes.status).toBe(200);
    expect(typeof needsReconfirmRes.body.needsReconfirmation).toBe('boolean');

    const deleteRes = await request(app).delete('/api/compliance-policy/policy-direct-network');
    expect(deleteRes.status).toBe(204);

    const getAfterDeleteRes = await request(app).get('/api/compliance-policy/policy-direct-network');
    expect(getAfterDeleteRes.status).toBe(404);
  });

  it('returns 404 for actions on an unknown policy', async () => {
    const app = buildApp();
    const res = await request(app).post('/api/compliance-policy/missing/confirm-same');
    expect(res.status).toBe(404);
  });

  it('rejects defining a policy with no rules', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/api/compliance-policy')
      .send({ id: 'p1', scope: 'route', route: 'job-posting', rules: [] });
    expect(res.status).toBe(400);
  });
});
