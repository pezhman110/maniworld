import request from 'supertest';
import { createApp } from '../src/server/app';

describe('consent conversion API', () => {
  it('creates records and returns JSON/CSV final output', async () => {
    const app = createApp();

    const createRes = await request(app)
      .post('/api/consent-conversion/records')
      .send({
        id: 'api-1',
        platform: 'instagram',
        accountHandle: '@buyer',
        source: 'inbound_message',
        sourceProof: 'User asked for details in DM',
        contact: {
          kind: 'phone',
          value: '+971500000002',
          proof: 'User sent phone in DM',
          verified: true,
        },
        consentGranted: true,
        consentProof: 'User wrote yes in DM',
        matchScore: 80,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.record.status).toBe('ready');

    const outputRes = await request(app).get('/api/consent-conversion/final-output');

    expect(outputRes.status).toBe(200);
    expect(outputRes.body.output.summary.ready).toBe(1);
    expect(outputRes.body.output.json[0].contactValue).toBe('+971500000002');
    expect(outputRes.body.output.csv).toContain('api-1,instagram,buyer');
  });

  it('updates consent after a permission-first public business path', async () => {
    const app = createApp();

    await request(app)
      .post('/api/consent-conversion/records')
      .send({
        id: 'api-2',
        platform: 'linkedin',
        accountHandle: 'company-page',
        source: 'public_business_contact',
        sourceProof: 'Public company page contact button',
        contact: {
          kind: 'email',
          value: 'sales@example.com',
          proof: 'Public company email',
        },
      });

    const consentRes = await request(app)
      .post('/api/consent-conversion/records/api-2/consent')
      .send({ proof: 'Company replied yes by email' });

    expect(consentRes.status).toBe(200);
    expect(consentRes.body.record.status).toBe('ready');
  });
});
