import { VideoSessionProvider } from '../src/modules/integrationClients/videoSessionProvider';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return impl as unknown as typeof fetch;
}

describe('VideoSessionProvider', () => {
  it('creates a Zoom meeting by first fetching an OAuth token then creating the meeting', async () => {
    const calledUrls: string[] = [];
    const fetchImpl = mockFetch(async (url) => {
      calledUrls.push(String(url));
      if (String(url).includes('zoom.us/oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'zoom-token' }), { status: 200 });
      }
      return new Response(JSON.stringify({ join_url: 'https://zoom.us/j/123' }), { status: 200 });
    });
    const provider = new VideoSessionProvider(fetchImpl);

    const meeting = await provider.createZoomMeeting(
      { topic: 'Sales call', startTimeIso: '2024-01-01T10:00:00Z' },
      { accountId: 'acc', clientId: 'id', clientSecret: 'secret' }
    );

    expect(meeting).toEqual({ provider: 'zoom', joinUrl: 'https://zoom.us/j/123' });
    expect(calledUrls[0]).toContain('oauth/token');
    expect(calledUrls[1]).toContain('meetings');
  });

  it('starts a Vapi call and returns the call id', async () => {
    const fetchImpl = mockFetch(async () => new Response(JSON.stringify({ id: 'call_123' }), { status: 200 }));
    const provider = new VideoSessionProvider(fetchImpl);

    const meeting = await provider.startVapiCall(
      { phoneNumber: '+989123456789', assistantId: 'asst_1' },
      { apiKey: 'vapi-key' }
    );

    expect(meeting).toEqual({ provider: 'vapi', callId: 'call_123' });
  });

  it('throws when the Zoom meeting API returns a non-ok status', async () => {
    const fetchImpl = mockFetch(async (url) => {
      if (String(url).includes('oauth/token')) {
        return new Response(JSON.stringify({ access_token: 'zoom-token' }), { status: 200 });
      }
      return new Response('error', { status: 500 });
    });
    const provider = new VideoSessionProvider(fetchImpl);

    await expect(
      provider.createZoomMeeting(
        { topic: 'x', startTimeIso: '2024-01-01T10:00:00Z' },
        { accountId: 'acc', clientId: 'id', clientSecret: 'secret' }
      )
    ).rejects.toThrow();
  });

  it('attaches a static Google Meet link without an API call', () => {
    const provider = new VideoSessionProvider();
    expect(provider.attachStaticMeetLink('https://meet.google.com/abc-defg-hij')).toEqual({
      provider: 'google-meet',
      joinUrl: 'https://meet.google.com/abc-defg-hij',
    });
  });
});
