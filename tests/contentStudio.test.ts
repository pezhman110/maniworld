import {
  ContentBriefRegistry,
  ContentPlanRegistry,
  InstagramCompanyAdRegistry,
  TrendResearchRegistry,
} from '../src/modules/contentStudio';

describe('contentStudio', () => {
  it('creates a content brief with an auto-generated bio/description', async () => {
    const briefs = new ContentBriefRegistry();
    const brief = await briefs.create({
      id: 'brief-1',
      platform: 'instagram',
      accountKind: 'company',
      topic: 'salon services in Dubai',
      referenceStyle: 'a well-known local salon page',
      trendKeywords: ['glass skin'],
    });

    expect(brief.bio).toContain('salon services in Dubai');
    expect(brief.bio).toContain('a well-known local salon page');
    expect(brief.description).toContain('glass skin');
    expect(await briefs.get('brief-1')).toEqual(brief);
    expect(await briefs.list()).toHaveLength(1);
  });

  it('rejects a duplicate brief id and an empty topic', async () => {
    const briefs = new ContentBriefRegistry();
    await briefs.create({ id: 'brief-1', platform: 'instagram', accountKind: 'personal', topic: 'skincare' });
    await expect(
      briefs.create({ id: 'brief-1', platform: 'instagram', accountKind: 'personal', topic: 'skincare' })
    ).rejects.toThrow();
    await expect(
      briefs.create({ id: 'brief-2', platform: 'instagram', accountKind: 'personal', topic: '' })
    ).rejects.toThrow();
  });

  it('generates a default 9-item plan cycling through every content type, each with a website destination', async () => {
    const briefs = new ContentBriefRegistry();
    const plans = new ContentPlanRegistry();
    const brief = await briefs.create({
      id: 'brief-1',
      platform: 'linkedin',
      accountKind: 'company',
      topic: 'banking partnerships',
    });

    const items = await plans.generatePlan({ brief, idPrefix: 'item' });

    expect(items).toHaveLength(9);
    const types = items.map((i) => i.type);
    expect(new Set(types)).toEqual(
      new Set(['post', 'carousel', 'single-banner', 'video', 'audio', 'text'])
    );
    for (const item of items) {
      expect(item.destinations.map((d) => d.channel)).toEqual(['linkedin', 'website']);
      expect(item.destinations.every((d) => d.status === 'draft')).toBe(true);
    }
    expect(await plans.listForBrief('brief-1')).toHaveLength(9);
  });

  it('supports a custom item count', async () => {
    const briefs = new ContentBriefRegistry();
    const plans = new ContentPlanRegistry();
    const brief = await briefs.create({ id: 'b', platform: 'tiktok', accountKind: 'personal', topic: 'fitness' });
    const items = await plans.generatePlan({ brief, idPrefix: 'i', count: 3 });
    expect(items).toHaveLength(3);
    await expect(plans.generatePlan({ brief, idPrefix: 'i2', count: 0 })).rejects.toThrow();
  });

  it('updates a destination status and surfaces items in the manual-fallback queue', async () => {
    const briefs = new ContentBriefRegistry();
    const plans = new ContentPlanRegistry();
    const brief = await briefs.create({ id: 'b', platform: 'facebook', accountKind: 'company', topic: 'events' });
    const [item] = await plans.generatePlan({ brief, idPrefix: 'i', count: 1 });

    expect(await plans.listFallbackQueue()).toHaveLength(0);

    const updated = await plans.updateDestination(item.id, 'facebook', {
      status: 'manual-fallback',
      failureReason: 'No credentials configured.',
    });
    expect(updated.destinations.find((d) => d.channel === 'facebook')?.status).toBe('manual-fallback');

    const queue = await plans.listFallbackQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(item.id);
  });

  it('records and lists trend notes per platform', async () => {
    const trends = new TrendResearchRegistry();
    await trends.record({ id: 't1', platform: 'tiktok', keyword: 'day in the life', source: 'TikTok Discover' });
    await trends.record({ id: 't2', platform: 'instagram', keyword: 'reels transitions', source: 'Instagram Explore' });

    expect(await trends.listForPlatform('tiktok')).toHaveLength(1);
    expect((await trends.listForPlatform('tiktok'))[0].keyword).toBe('day in the life');
  });

  it('creates Instagram company ads with compliance notes and validates budget/currency', async () => {
    const ads = new InstagramCompanyAdRegistry();
    const ad = await ads.create({
      id: 'ad-1',
      companyName: 'Mani World',
      objective: 'traffic',
      caption: 'Book your consultation today',
      mediaUrl: 'https://example.com/ad.jpg',
      landingUrl: 'https://example.com/landing',
      dailyBudgetMinor: 5000,
      currency: 'aed',
      targetLocations: ['ae', ''],
      targetInterests: ['beauty', 'business'],
    });

    expect(ad.status).toBe('draft');
    expect(ad.currency).toBe('AED');
    expect(ad.targetLocations).toEqual(['ae']);
    expect(ad.complianceNotes.join(' ')).toMatch(/official Meta Marketing API/i);
    expect(await ads.list()).toHaveLength(1);
    await expect(
      ads.create({
        id: 'ad-2',
        companyName: 'Mani World',
        objective: 'traffic',
        caption: 'x',
        mediaUrl: 'https://example.com/ad.jpg',
        landingUrl: 'https://example.com/landing',
        dailyBudgetMinor: 0,
        currency: 'AED',
      })
    ).rejects.toThrow();
  });

  it('updates Instagram ad submission state and lists manual fallback ads', async () => {
    const ads = new InstagramCompanyAdRegistry();
    await ads.create({
      id: 'ad-1',
      companyName: 'Mani World',
      objective: 'leads',
      caption: 'Contact us',
      mediaUrl: 'https://example.com/ad.jpg',
      landingUrl: 'https://example.com/landing',
      dailyBudgetMinor: 1000,
      currency: 'USD',
    });

    const updated = await ads.updateSubmission('ad-1', {
      status: 'manual-fallback',
      failureReason: 'missing credentials',
    });

    expect(updated.status).toBe('manual-fallback');
    expect(await ads.listFallbackQueue()).toHaveLength(1);
  });
});
