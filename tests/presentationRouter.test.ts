import request from 'supertest';
import { createApp } from '../src/server/app';

describe('presentation campaigns API', () => {
  function buildApp() {
    return createApp({});
  }

  it('creates an audience profile, a scoped commission model, a resume intake, and a landing page end-to-end', async () => {
    const app = buildApp();

    const profileRes = await request(app)
      .post('/api/presentation/audience-profiles')
      .send({
        id: 'banking',
        label: 'Banking sector',
        targetText: 'Corporate wellness benefit for your bank staff.',
        goals: ['sign-corporate-contract', 'compliance-review'],
        vertical: 'banking',
      });
    expect(profileRes.status).toBe(201);

    const updateRes = await request(app)
      .put('/api/presentation/audience-profiles/banking')
      .send({ label: 'Banking sector (updated)' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.audienceProfile.label).toBe('Banking sector (updated)');

    const commissionRes = await request(app)
      .post('/api/presentation/commission-models')
      .send({
        id: 'banking-tiered',
        label: 'Banking tiered plan',
        type: 'tiered',
        tiers: [{ upToCount: 10, rate: 5 }, { rate: 8 }],
        audienceProfileId: 'banking',
      });
    expect(commissionRes.status).toBe(201);

    const listCommissionsRes = await request(app).get(
      '/api/presentation/commission-models?audienceProfileId=banking'
    );
    expect(listCommissionsRes.body.commissionModels).toHaveLength(1);

    const resumeRes = await request(app).post('/api/presentation/resumes').send({
      candidateName: 'Jane Doe',
      source: 'linkedin',
      url: 'https://linkedin.com/in/jane-doe',
      audienceProfileId: 'banking',
    });
    expect(resumeRes.status).toBe(201);

    const landingRes = await request(app)
      .post('/api/presentation/landing-pages')
      .send({
        id: 'bank-page',
        slug: 'bank-consult',
        domain: 'consult.example.com',
        heroText: 'Book your free consultation for bank staff.',
        audienceProfileId: 'banking',
        contentBlocks: [{ label: 'address', content: 'Tehran, Valiasr St.' }],
      });
    expect(landingRes.status).toBe(201);

    const addBlockRes = await request(app)
      .post('/api/presentation/landing-pages/bank-page/content-blocks')
      .send({ label: 'phone', content: '+98 21 0000 0000' });
    expect(addBlockRes.status).toBe(201);
    expect(addBlockRes.body.landingPage.contentBlocks).toHaveLength(2);

    const bySlugRes = await request(app).get('/api/presentation/landing-pages/by-slug/bank-consult');
    expect(bySlugRes.status).toBe(200);
    expect(bySlugRes.body.landingPage.id).toBe('bank-page');
  });

  it('returns 404 when updating a missing audience profile', async () => {
    const app = buildApp();
    const res = await request(app).put('/api/presentation/audience-profiles/missing').send({ label: 'x' });
    expect(res.status).toBe(404);
  });
});
