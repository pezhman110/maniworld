import { PagesWebsitesRegistry, PageBrief } from '../src/modules/pagesWebsites';

function brief(overrides: Partial<PageBrief> = {}): PageBrief {
  return {
    startMode: 'based-on-target',
    goal: 'get-bookings',
    targetAudience: 'salon-customer',
    pageType: 'salon-booking-page',
    brandKitId: 'globex-horizon',
    colorStyle: 'Luxury black / gold',
    languageMode: 'en',
    inspirationUrls: [],
    requiredBlocks: ['luxury-beauty-hero', 'booking-form', 'privacy'],
    requiredFormFields: [],
    dataDestination: 'customer-crm',
    targetId: 'target-90-salon-customers-daily',
    requiredActions: ['create-lead', 'score-lead', 'route-lead'],
    requiredTools: ['smart-form', 'analytics'],
    complianceRequirements: ['privacy', 'consent'],
    analyticsRequirements: ['views', 'submissions', 'conversion-rate'],
    postSubmitWorkflow: [],
    ...overrides,
  };
}

describe('PagesWebsitesRegistry', () => {
  it('exposes the requested templates, blocks, brand kits and options', () => {
    const registry = new PagesWebsitesRegistry();
    expect(registry.listTemplates()).toHaveLength(15);
    expect(registry.listBlocks().length).toBeGreaterThanOrEqual(50);
    expect(registry.listBrandKits().map((brand) => brand.brandName)).toEqual(
      expect.arrayContaining(['Globex Horizon', 'ELARIS', 'ManiWorld', 'Custom brand', 'Client brand'])
    );
    expect(registry.listOptions().languageModes).toContain('en-ar-fa');
  });

  it('creates a target-connected smart-form page and calculates a publishable quality score', async () => {
    const registry = new PagesWebsitesRegistry();
    const page = await registry.createPage({
      id: 'salon-dubai',
      slug: 'salon-booking-dubai',
      title: 'Salon Booking Dubai',
      templateId: 'salon-booking',
      brief: brief(),
      seo: { title: 'Salon Booking Dubai', metaDescription: 'Book a luxury salon appointment in Dubai.' },
    });

    expect(page.form.destination).toBe('customer-crm');
    expect(page.form.fields.map((field) => field.key)).toEqual(expect.arrayContaining(['name', 'phone', 'serviceInterest', 'preferredDate']));
    expect(page.brief.postSubmitWorkflow).toEqual(
      expect.arrayContaining(['score-customer', 'create-booking-task', 'send-whatsapp', 'add-to-target-progress'])
    );

    const quality = await registry.calculateQualityScore(page.id);
    expect(quality.score).toBeGreaterThanOrEqual(80);
    expect(quality.status).toMatch(/ready/);
  });

  it('supports approval, publishing, public tracking, submissions, referrals and A/B variants', async () => {
    const registry = new PagesWebsitesRegistry();
    await registry.createPage({
      id: 'investor-page',
      slug: 'investor-beauty-city',
      title: 'Investor Beauty City',
      templateId: 'investor-pitch',
      brief: brief({
        goal: 'attract-investors',
        targetAudience: 'investor',
        pageType: 'investor-page',
        dataDestination: 'investor-crm',
        targetId: '70-investor-meetings-weekly',
      }),
      seo: { title: 'Investor Beauty City', metaDescription: 'Request an investor meeting.' },
    });
    const variant = await registry.addVariant('investor-page', 'A', 'Luxury investor headline');
    await registry.createReferralLink({
      pageId: 'investor-page',
      referrerType: 'partner',
      referrerId: 'hotel-1',
      referralCode: 'HOTEL1',
    });
    const approval = await registry.requestApproval('investor-page', 'manager');
    expect(approval.requiredApprovers).toEqual(['CEO', 'Legal']);
    await registry.decideApproval(approval.id, 'approved', 'ceo');
    await registry.publish('investor-page', 'manager');

    await registry.trackView('investor-beauty-city', { visitorId: 'v1', variantId: variant.id, source: 'linkedin', referralCode: 'HOTEL1', language: 'ar' });
    await registry.trackFormStart('investor-beauty-city');
    const submission = await registry.submit('investor-beauty-city', {
      variantId: variant.id,
      referralCode: 'HOTEL1',
      language: 'ar',
      values: { name: 'Investor', phone: '+971500000000', email: 'i@example.com', ticketSize: '500000', investorType: 'angel', consent: true },
      utm: { source: 'linkedin', campaign: 'investor' },
    });

    expect(submission.routedTo).toBe('investor-crm');
    expect(submission.lifecycle).toContain('qualified');
    const [referral] = await registry.listReferrals('investor-page');
    expect(referral.clicks).toBe(1);
    expect(referral.submissions).toBe(1);
    const published = await registry.get('investor-page');
    expect(published?.analytics.submissions).toBe(1);
    expect(published?.variants[0].metrics.submissions).toBe(1);
  });

  it('records separate file and voice imports for lead extraction workflows', async () => {
    const registry = new PagesWebsitesRegistry();
    const fileImport = await registry.recordImport({ kind: 'file', fileName: 'seller-profile.pdf', intent: 'seller-valuation' });
    const voiceImport = await registry.recordImport({ kind: 'voice', fileName: 'call-recording.mp3', language: 'fa', extractedLead: { phone: '+989120000000' } });
    expect(fileImport.status).toBe('uploaded');
    expect(voiceImport.status).toBe('parsed');
  });
});
