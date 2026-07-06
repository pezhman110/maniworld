import request from 'supertest';
import { createApp } from '../src/server/app';
import { createSocialPublisher } from '../src/modules/socialPublisher';

describe('content studio API', () => {
  function buildApp(publish = createSocialPublisher(mockFetch(async () => new Response('error', { status: 500 })))) {
    return createApp({ publishContent: publish });
  }

  function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
    return impl as unknown as typeof fetch;
  }

  it('creates a brief, generates a 9-item plan, and publishes the website destination', async () => {
    const app = buildApp();

    const briefRes = await request(app).post('/api/content-studio/briefs').send({
      id: 'brief-1',
      platform: 'instagram',
      accountKind: 'company',
      topic: 'salon services',
      trendKeywords: ['glass skin'],
    });
    expect(briefRes.status).toBe(201);
    expect(briefRes.body.brief.bio).toContain('salon services');

    const planRes = await request(app).post('/api/content-studio/briefs/brief-1/plan').send({});
    expect(planRes.status).toBe(201);
    expect(planRes.body.items).toHaveLength(9);

    const itemId = planRes.body.items[0].id;
    const publishRes = await request(app).post(`/api/content-studio/items/${itemId}/publish/website`).send({});
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.result.status).toBe('published');
  });

  it('routes a failed social publish attempt to the manual-fallback queue', async () => {
    const app = buildApp();

    await request(app).post('/api/content-studio/briefs').send({
      id: 'brief-2',
      platform: 'facebook',
      accountKind: 'personal',
      topic: 'weekly deals',
    });
    const planRes = await request(app)
      .post('/api/content-studio/briefs/brief-2/plan')
      .send({ count: 1 });
    const itemId = planRes.body.items[0].id;

    const publishRes = await request(app).post(`/api/content-studio/items/${itemId}/publish/facebook`).send({});
    expect(publishRes.status).toBe(200);
    expect(publishRes.body.result.status).toBe('manual-fallback');

    const queueRes = await request(app).get('/api/content-studio/fallback-queue');
    expect(queueRes.body.items).toHaveLength(1);
    expect(queueRes.body.items[0].id).toBe(itemId);
  });

  it('404s when generating a plan for an unknown brief or publishing an unknown item/destination', async () => {
    const app = buildApp();
    const planRes = await request(app).post('/api/content-studio/briefs/missing/plan').send({});
    expect(planRes.status).toBe(404);

    const publishRes = await request(app).post('/api/content-studio/items/missing/publish/website').send({});
    expect(publishRes.status).toBe(404);
  });

  it('records and lists trend notes', async () => {
    const app = buildApp();
    const createRes = await request(app)
      .post('/api/content-studio/trends')
      .send({ platform: 'tiktok', keyword: 'day in the life', source: 'TikTok Discover' });
    expect(createRes.status).toBe(201);

    const listRes = await request(app).get('/api/content-studio/trends').query({ platform: 'tiktok' });
    expect(listRes.body.trends).toHaveLength(1);
  });
});
