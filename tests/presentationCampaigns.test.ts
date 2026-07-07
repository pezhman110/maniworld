import {
  AudienceProfileRegistry,
  CommissionModelRegistry,
  LandingPageRegistry,
  ResumeIntakeRegistry,
} from '../src/modules/presentationCampaigns';

describe('AudienceProfileRegistry', () => {
  it('lets a manager define an audience with its own target text and goals', async () => {
    const registry = new AudienceProfileRegistry();
    const profile = await registry.create({
      id: 'influencer',
      label: 'Influencers',
      targetText: 'Grow your brand with our exclusive salon partnership.',
      goals: ['sign-collab-agreement', 'book-content-shoot'],
    });
    expect(profile.active).toBe(true);
    expect(await registry.list()).toHaveLength(1);
  });

  it('changes the audience and its goals when the manager switches to a banking vertical', async () => {
    const registry = new AudienceProfileRegistry();
    await registry.create({
      id: 'segment-1',
      label: 'Influencers',
      targetText: 'Influencer pitch',
      goals: ['sign-collab-agreement'],
    });

    const updated = await registry.update('segment-1', {
      label: 'Banking sector',
      targetText: 'Corporate wellness benefit for your bank staff.',
      goals: ['sign-corporate-contract', 'compliance-review'],
      vertical: 'banking',
    });

    expect(updated.label).toBe('Banking sector');
    expect(updated.goals).toEqual(['sign-corporate-contract', 'compliance-review']);
    expect(updated.vertical).toBe('banking');
  });

  it('rejects a duplicate audience profile id', async () => {
    const registry = new AudienceProfileRegistry();
    const params = { id: 'company', label: 'Company', targetText: 'x', goals: ['g1'] };
    await registry.create(params);
    await expect(registry.create(params)).rejects.toThrow();
  });

  it('requires at least one goal', async () => {
    const registry = new AudienceProfileRegistry();
    await expect(
      registry.create({ id: 'group', label: 'Group', targetText: 'x', goals: [] })
    ).rejects.toThrow();
  });

  it('supports assigning a route, regions, daily cap and working hours to a group', async () => {
    const registry = new AudienceProfileRegistry();
    const profile = await registry.create({
      id: 'freelancers-beauty',
      label: 'Freelance beauty service providers',
      targetText: 'Partner with our salon network.',
      goals: ['sign-collab-agreement'],
      route: 'direct-network',
      regions: ['Iran-Tehran', 'UAE-Dubai'],
      dailyCap: 50,
      workingHours: { startHour: 9, endHour: 18 },
    });
    expect(profile.route).toBe('direct-network');
    expect(profile.regions).toEqual(['Iran-Tehran', 'UAE-Dubai']);
    expect(profile.dailyCap).toBe(50);
    expect(profile.workingHours).toEqual({ startHour: 9, endHour: 18 });
  });

  it('rejects an invalid route', async () => {
    const registry = new AudienceProfileRegistry();
    await expect(
      registry.create({
        id: 'bad-route',
        label: 'Bad',
        targetText: 'x',
        goals: ['g1'],
        route: 'invalid-route' as never,
      })
    ).rejects.toThrow();
  });

  it('rejects an invalid working-hours window', async () => {
    const registry = new AudienceProfileRegistry();
    await expect(
      registry.create({
        id: 'bad-hours',
        label: 'Bad',
        targetText: 'x',
        goals: ['g1'],
        workingHours: { startHour: 18, endHour: 9 },
      })
    ).rejects.toThrow();
  });

  it('lets a manager change the route/regions/policy of an existing group', async () => {
    const registry = new AudienceProfileRegistry();
    await registry.create({
      id: 'group-x',
      label: 'Group X',
      targetText: 'x',
      goals: ['g1'],
    });
    const updated = await registry.update('group-x', {
      route: 'job-posting',
      regions: ['Iran-Isfahan'],
      dailyCap: 20,
    });
    expect(updated.route).toBe('job-posting');
    expect(updated.regions).toEqual(['Iran-Isfahan']);
    expect(updated.dailyCap).toBe(20);
  });
});

describe('CommissionModelRegistry', () => {
  it('creates a percentage commission model scoped to an audience profile', async () => {
    const registry = new CommissionModelRegistry();
    const model = await registry.create({
      id: 'standard-percent',
      label: 'Standard 10%',
      type: 'percentage',
      rate: 10,
      audienceProfileId: 'influencer',
    });
    expect(model.rate).toBe(10);
    expect(await registry.listForAudienceProfile('influencer')).toHaveLength(1);
  });

  it('switching to a banking-only commission model replaces the effective plan for that audience', async () => {
    const registry = new CommissionModelRegistry();
    await registry.create({ id: 'general', label: 'General', type: 'percentage', rate: 10 });
    await registry.create({
      id: 'banking-tiered',
      label: 'Banking tiered',
      type: 'tiered',
      tiers: [
        { upToCount: 10, rate: 5 },
        { rate: 8 },
      ],
      audienceProfileId: 'banking',
    });

    const bankingModels = await registry.listForAudienceProfile('banking');
    expect(bankingModels).toHaveLength(1);
    expect(bankingModels[0].tiers?.length).toBe(2);
  });

  it('requires a rate for percentage/flat models', async () => {
    const registry = new CommissionModelRegistry();
    await expect(
      registry.create({ id: 'bad', label: 'Bad', type: 'percentage' })
    ).rejects.toThrow();
  });

  it('requires at least one tier for tiered models', async () => {
    const registry = new CommissionModelRegistry();
    await expect(
      registry.create({ id: 'bad-tiered', label: 'Bad', type: 'tiered' })
    ).rejects.toThrow();
  });
});

describe('ResumeIntakeRegistry', () => {
  it('records a resume sourced from Indeed', async () => {
    const registry = new ResumeIntakeRegistry();
    const intake = await registry.record({
      candidateName: 'Jane Doe',
      source: 'indeed',
      url: 'https://indeed.com/r/jane-doe',
    });
    expect(intake.source).toBe('indeed');
    expect(await registry.list()).toHaveLength(1);
  });

  it('records a resume sourced from LinkedIn', async () => {
    const registry = new ResumeIntakeRegistry();
    const intake = await registry.record({
      candidateName: 'John Roe',
      source: 'linkedin',
      url: 'https://linkedin.com/in/john-roe',
    });
    expect(intake.source).toBe('linkedin');
  });

  it('rejects a link-based source without a valid http(s) url', async () => {
    const registry = new ResumeIntakeRegistry();
    await expect(
      registry.record({ candidateName: 'No Url', source: 'linkedin' })
    ).rejects.toThrow();
  });

  it('allows an upload source without a url', async () => {
    const registry = new ResumeIntakeRegistry();
    const intake = await registry.record({ candidateName: 'Uploaded Person', source: 'upload' });
    expect(intake.url).toBeUndefined();
  });
});

describe('LandingPageRegistry', () => {
  it('creates a single-page site with a slug and manually-added content blocks', async () => {
    const registry = new LandingPageRegistry();
    const site = await registry.create({
      id: 'bank-page',
      slug: 'bank-consult',
      heroText: 'Book your free consultation.',
      contentBlocks: [{ label: 'address', content: 'Tehran, Valiasr St.' }],
      audienceProfileId: 'banking',
    });
    expect(site.slug).toBe('bank-consult');
    expect(site.contentBlocks).toHaveLength(1);
  });

  it('lets a manager manually add extra words/sentences/addresses after creation', async () => {
    const registry = new LandingPageRegistry();
    await registry.create({ id: 'page-1', slug: 'page-one', heroText: 'Hero' });
    const updated = await registry.addContentBlock('page-1', {
      label: 'phone',
      content: '+98 21 0000 0000',
    });
    expect(updated.contentBlocks).toHaveLength(1);
  });

  it('rejects a duplicate slug', async () => {
    const registry = new LandingPageRegistry();
    await registry.create({ id: 'page-1', slug: 'duplicate-slug', heroText: 'Hero' });
    await expect(
      registry.create({ id: 'page-2', slug: 'duplicate-slug', heroText: 'Hero 2' })
    ).rejects.toThrow();
  });

  it('rejects an invalid slug format', async () => {
    const registry = new LandingPageRegistry();
    await expect(
      registry.create({ id: 'page-1', slug: 'Not A Valid Slug!', heroText: 'Hero' })
    ).rejects.toThrow();
  });

  it('resolves a site by slug', async () => {
    const registry = new LandingPageRegistry();
    await registry.create({ id: 'page-1', slug: 'find-me', heroText: 'Hero' });
    const found = await registry.getBySlug('find-me');
    expect(found?.id).toBe('page-1');
  });
});
