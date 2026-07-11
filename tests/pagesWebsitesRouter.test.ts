import request from 'supertest';
import { createApp } from '../src/server/app';
import { PageBrief } from '../src/modules/pagesWebsites';

function brief(): PageBrief {
  return {
    startMode: 'based-on-target',
    goal: 'get-bookings',
    targetAudience: 'salon-customer',
    pageType: 'salon-booking-page',
    brandKitId: 'globex-horizon',
    colorStyle: 'Luxury black / gold',
    languageMode: 'en-ar-fa',
    inspirationUrls: [],
    requiredBlocks: [
      'luxury-beauty-hero',
      'booking-form',
      'privacy',
    ],
    requiredFormFields: [],
    dataDestination: 'customer-crm',
    targetId: '90-salon-customers-per-day',
    requiredActions: ['create-lead', 'score-lead', 'route-lead'],
    requiredTools: ['smart-form', 'analytics'],
    complianceRequirements: ['privacy', 'consent'],
    analyticsRequirements: ['views', 'submissions'],
    postSubmitWorkflow: [],
  };
}

describe('pages websites API and public renderer', () => {
  it('creates, approves, publishes, renders and receives submissions', async () => {
    const app = createApp({});
    const catalogRes = await request(app).get('/api/pages-websites/catalog');
    expect(catalogRes.status).toBe(200);
    expect(catalogRes.body.templates).toHaveLength(15);

    const createRes = await request(app)
      .post('/api/pages-websites/pages')
      .send({
        id: 'salon-page',
        slug: 'salon-public',
        title: 'Salon Public',
        templateId: 'salon-booking',
        brief: brief(),
        seo: { title: 'Salon Public', metaDescription: 'Book now' },
        blocks: [
          { id: 'b1', definitionId: 'luxury-beauty-hero', locale: 'en', content: { title: 'Book salon', body: 'Luxury beauty' } },
          { id: 'b2', definitionId: 'luxury-beauty-hero', locale: 'ar', content: { title: 'صالون', body: 'جمال' } },
          { id: 'b3', definitionId: 'luxury-beauty-hero', locale: 'fa', content: { title: 'سالن', body: 'زیبایی' } },
          { id: 'b4', definitionId: 'privacy', content: { title: 'Privacy', body: 'Consent required' } },
        ],
      });
    expect(createRes.status).toBe(201);

    const approvalRes = await request(app).post('/api/pages-websites/pages/salon-page/approval-requests').send({ requestedBy: 'qa' });
    expect(approvalRes.status).toBe(201);
    await request(app)
      .post(`/api/pages-websites/approval-requests/${approvalRes.body.approvalRequest.id}/decision`)
      .send({ decision: 'approved', decidedBy: 'marketing' })
      .expect(200);

    await request(app).post('/api/pages-websites/pages/salon-page/publish').send({ actor: 'qa' }).expect(200);

    const renderRes = await request(app).get('/public/page/salon-public?language=fa&visitorId=v1&source=instagram');
    expect(renderRes.status).toBe(200);
    expect(renderRes.text).toContain('dir="rtl"');

    const submitRes = await request(app)
      .post('/public/page/salon-public/submissions')
      .send({ values: { name: 'A', phone: '+971500000000', serviceInterest: 'hair', consent: true }, utm: { source: 'instagram' } });
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.submission.routedTo).toBe('customer-crm');

    const submissionsRes = await request(app).get('/api/pages-websites/pages/salon-page/submissions');
    expect(submissionsRes.body.submissions).toHaveLength(1);
  });

  it('records voice imports through the admin API', async () => {
    const app = createApp({});
    const res = await request(app).post('/api/pages-websites/imports/voice').send({ fileName: 'lead-call.mp3', language: 'fa', intent: 'booking' });
    expect(res.status).toBe(201);
    expect(res.body.import.kind).toBe('voice');
  });
});
