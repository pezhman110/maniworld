import { createInstagramAdPublisher, createSocialPublisher, publishToWebsite } from '../src/modules/socialPublisher';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return impl as unknown as typeof fetch;
}

describe('socialPublisher', () => {
  it('always routes Snapchat to manual fallback (no public organic content API exists)', async () => {
    const publish = createSocialPublisher();
    const result = await publish('snapchat', { accessToken: 'x' }, { caption: 'hello' });
    expect(result.status).toBe('manual-fallback');
    expect(result.message).toMatch(/no public API/i);
  });

  it('routes to manual fallback when no credentials are stored for a platform', async () => {
    const publish = createSocialPublisher();
    const result = await publish('instagram', undefined, { caption: 'hello' });
    expect(result.status).toBe('manual-fallback');
    expect(result.message).toMatch(/no stored/i);
  });

  it('publishes via the Meta Graph API when Instagram credentials and a successful response are present', async () => {
    const fetchImpl = mockFetch(async () => new Response(JSON.stringify({ id: 'media123' }), { status: 200 }));
    const publish = createSocialPublisher(fetchImpl);

    const result = await publish(
      'instagram',
      { igUserId: '12345', accessToken: 'token' },
      { caption: 'A new post' }
    );

    expect(result.status).toBe('published');
  });

  it('falls back to manual when the Meta Graph API call fails', async () => {
    const fetchImpl = mockFetch(async () => new Response('error', { status: 401 }));
    const publish = createSocialPublisher(fetchImpl);

    const result = await publish('facebook', { pageId: '1', accessToken: 'bad' }, { caption: 'hi' });
    expect(result.status).toBe('manual-fallback');
  });

  it('falls back to manual when the network call throws', async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error('network down');
    });
    const publish = createSocialPublisher(fetchImpl);

    const result = await publish('linkedin', { accessToken: 't', authorUrn: 'urn:li:person:1' }, { caption: 'hi' });
    expect(result.status).toBe('manual-fallback');
    expect(result.message).toMatch(/network down/);
  });

  it('publishes via the LinkedIn UGC Posts API when credentials are present', async () => {
    const fetchImpl = mockFetch(async () => new Response('', { status: 201 }));
    const publish = createSocialPublisher(fetchImpl);

    const result = await publish(
      'linkedin',
      { accessToken: 'token', authorUrn: 'urn:li:person:1' },
      { caption: 'hi' }
    );
    expect(result.status).toBe('published');
  });

  it('publishes via the TikTok Content Posting API when credentials are present', async () => {
    const fetchImpl = mockFetch(async () => new Response('', { status: 200 }));
    const publish = createSocialPublisher(fetchImpl);

    const result = await publish('tiktok', { accessToken: 'token' }, { caption: 'hi' });
    expect(result.status).toBe('published');
  });

  it('always publishes the website destination locally with no network call', () => {
    const result = publishToWebsite();
    expect(result.status).toBe('published');
  });

  it('creates a paused Instagram ad through Meta Marketing API credentials', async () => {
    const calls: string[] = [];
    const fetchImpl = mockFetch(async (url) => {
      calls.push(url);
      return new Response(JSON.stringify({ id: `id-${calls.length}` }), { status: 200 });
    });
    const publishAd = createInstagramAdPublisher(fetchImpl);

    const result = await publishAd(
      { accessToken: 'token', adAccountId: '123', pageId: 'page-1', instagramActorId: 'ig-1' },
      {
        id: 'ad-1',
        companyName: 'Mani World',
        objective: 'traffic',
        caption: 'Book today',
        mediaUrl: 'https://example.com/ad.jpg',
        landingUrl: 'https://example.com',
        dailyBudgetMinor: 5000,
        currency: 'AED',
        targetLocations: ['AE'],
        targetInterests: ['beauty'],
        callToAction: 'LEARN_MORE',
        status: 'draft',
        complianceNotes: [],
        createdAt: 1,
      }
    );

    expect(result.status).toBe('submitted');
    expect(result.metaCampaignId).toBe('id-1');
    expect(result.metaAdId).toBe('id-4');
    expect(calls).toEqual([
      'https://graph.facebook.com/v19.0/act_123/campaigns',
      'https://graph.facebook.com/v19.0/act_123/adsets',
      'https://graph.facebook.com/v19.0/act_123/adcreatives',
      'https://graph.facebook.com/v19.0/act_123/ads',
    ]);
  });

  it('routes Instagram ads to manual fallback when credentials or Meta calls fail', async () => {
    const publishAd = createInstagramAdPublisher(mockFetch(async () => new Response('error', { status: 400 })));
    const ad = {
      id: 'ad-1',
      companyName: 'Mani World',
      objective: 'traffic' as const,
      caption: 'Book today',
      mediaUrl: 'https://example.com/ad.jpg',
      landingUrl: 'https://example.com',
      dailyBudgetMinor: 5000,
      currency: 'AED',
      targetLocations: [],
      targetInterests: [],
      callToAction: 'LEARN_MORE' as const,
      status: 'draft' as const,
      complianceNotes: [],
      createdAt: 1,
    };

    expect((await publishAd(undefined, ad)).status).toBe('manual-fallback');
    const failed = await publishAd(
      { accessToken: 'token', adAccountId: '123', pageId: 'page-1', instagramActorId: 'ig-1' },
      ad
    );
    expect(failed.status).toBe('manual-fallback');
    expect(failed.message).toMatch(/campaign creation failed/i);
  });
});
