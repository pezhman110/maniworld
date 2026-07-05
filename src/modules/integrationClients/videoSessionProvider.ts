/**
 * Vapi / Zoom / Google Meet adapter.
 *
 * `videoSession.ts` models the session plan (presenter roles, scenario,
 * checklist) but cannot start a real meeting. This module creates the
 * actual meeting/call so the plan's `VideoSessionAssignment` has a real
 * join link or call id to hand to the attendee.
 */

export type VideoProvider = 'zoom' | 'google-meet' | 'vapi';

export interface CreatedMeeting {
  provider: VideoProvider;
  joinUrl?: string;
  callId?: string;
}

export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
}

export interface VapiCredentials {
  apiKey: string;
}

type FetchLike = typeof fetch;

export class VideoSessionProvider {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  /** Creates a real Zoom meeting via the Server-to-Server OAuth + Meetings API. */
  async createZoomMeeting(
    params: { topic: string; startTimeIso: string },
    credentials: ZoomCredentials
  ): Promise<CreatedMeeting> {
    const accessToken = await this.getZoomAccessToken(credentials);
    const response = await this.fetchImpl('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic: params.topic, type: 2, start_time: params.startTimeIso }),
    });
    if (!response.ok) {
      throw new Error(`Zoom meeting creation failed with status ${response.status}`);
    }
    const body = (await response.json()) as { join_url?: string };
    return { provider: 'zoom', joinUrl: body.join_url };
  }

  private async getZoomAccessToken(credentials: ZoomCredentials): Promise<string> {
    const basicAuth = Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64');
    const response = await this.fetchImpl(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
        credentials.accountId
      )}`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${basicAuth}` },
      }
    );
    if (!response.ok) {
      throw new Error(`Zoom OAuth token request failed with status ${response.status}`);
    }
    const body = (await response.json()) as { access_token?: string };
    if (!body.access_token) {
      throw new Error('Zoom OAuth response did not include an access_token.');
    }
    return body.access_token;
  }

  /** Starts a real outbound Vapi voice call. */
  async startVapiCall(
    params: { phoneNumber: string; assistantId: string },
    credentials: VapiCredentials
  ): Promise<CreatedMeeting> {
    const response = await this.fetchImpl('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + credentials.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ assistantId: params.assistantId, customer: { number: params.phoneNumber } }),
    });
    if (!response.ok) {
      throw new Error(`Vapi call creation failed with status ${response.status}`);
    }
    const body = (await response.json()) as { id?: string };
    return { provider: 'vapi', callId: body.id };
  }

  /** Google Meet has no simple server-side "create meeting" REST call without full Calendar OAuth; this attaches a pre-provisioned recurring Meet link instead. */
  attachStaticMeetLink(joinUrl: string): CreatedMeeting {
    return { provider: 'google-meet', joinUrl };
  }
}
