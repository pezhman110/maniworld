import { createSocialPublisher, publishToWebsite } from '../src/modules/socialPublisher';

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
});
