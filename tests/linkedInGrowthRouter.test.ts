import request from 'supertest';
import { createApp } from '../src/server/app';
import { LinkedInLegalGrowthRegistry } from '../src/modules/linkedInLegalGrowth';

describe('linkedInGrowthRouter', () => {
  it('creates a lead, records a form, assigns seller, and returns tools through authenticated API', async () => {
    const app = createApp({ adminApiKey: 'secret', linkedInGrowth: new LinkedInLegalGrowthRegistry() });
    const headers = { 'x-api-key': 'secret' };

    await request(app)
      .post('/api/linkedin-growth/leads')
      .set(headers)
      .send({ id: 'li-api-1', name: 'Buyer One', scope: 'personal', leadType: 'buyer', source: 'manual Sales Navigator research', score: 77 })
      .expect(201);

    await request(app)
      .post('/api/linkedin-growth/leads/li-api-1/lead-gen-form')
      .set(headers)
      .send({ formId: 'buyer-form', answers: { Email: 'buyer@example.com', Budget: '300k AED' }, proof: 'LinkedIn form proof.' })
      .expect(200);

    const assigned = await request(app)
      .post('/api/linkedin-growth/leads/li-api-1/assign-seller')
      .set(headers)
      .send({ seller: 'Neda', reason: 'Buyer form submitted.', slaFollowUpDeadline: Date.now() + 86400000 })
      .expect(200);

    expect(assigned.body.lead.sellerAssignment.brief.availableActions).toContain('book-meeting');

    const tools = await request(app).get('/api/linkedin-growth/tools').set(headers).expect(200);
    expect(tools.body.tools.some((tool: { name: string }) => tool.name === 'LinkedIn Lead Gen Forms')).toBe(true);
  });
});
