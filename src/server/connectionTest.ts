import { IntegrationProvider } from '../modules/credentialsStore';
import { TwilioPhoneValidator } from '../modules/integrationClients/twilioClient';
import { ApolloClient } from '../modules/integrationClients/apolloClient';

/**
 * "Test connection" logic for the dashboard's Connections page: given a
 * provider's currently stored (decrypted) credential fields, makes a
 * lightweight real API call to confirm the credentials actually work, and
 * reports back a connected/invalid status plus a human-readable message.
 */

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export type ConnectionTester = (
  provider: IntegrationProvider,
  fields: Record<string, string>
) => Promise<ConnectionTestResult>;

export function createConnectionTester(fetchImpl: typeof fetch = fetch): ConnectionTester {
  const twilio = new TwilioPhoneValidator(fetchImpl);
  const apollo = new ApolloClient(fetchImpl);

  return async (provider, fields) => {
    try {
      switch (provider) {
        case 'twilio': {
          const result = await twilio.validate('+15005550006', {
            accountSid: fields.accountSid,
            authToken: fields.authToken,
          });
          if (result.source !== 'twilio-lookup') {
            return { ok: false, message: result.error ?? 'Twilio Lookup did not respond.' };
          }
          return { ok: true, message: 'Twilio Lookup responded successfully.' };
        }
        case 'telegram': {
          const response = await fetchImpl(`https://api.telegram.org/bot${fields.botToken}/getMe`);
          if (!response.ok) return { ok: false, message: `Telegram getMe failed with status ${response.status}` };
          return { ok: true, message: 'Telegram bot token is valid.' };
        }
        case 'whatsapp': {
          const response = await fetchImpl(
            `https://graph.facebook.com/v19.0/${fields.phoneNumberId}?fields=display_phone_number`,
            { headers: { Authorization: `Token ${fields.accessToken}` } }
          );
          if (!response.ok) return { ok: false, message: `WhatsApp API failed with status ${response.status}` };
          return { ok: true, message: 'WhatsApp phone number id is reachable.' };
        }
        case 'zoom': {
          const response = await fetchImpl(
            `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(
              fields.accountId
            )}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${Buffer.from(`${fields.clientId}:${fields.clientSecret}`).toString(
                  'base64'
                )}`,
              },
            }
          );
          if (!response.ok) return { ok: false, message: `Zoom OAuth failed with status ${response.status}` };
          return { ok: true, message: 'Zoom Server-to-Server OAuth succeeded.' };
        }
        case 'vapi': {
          const response = await fetchImpl('https://api.vapi.ai/assistant', {
            headers: { Authorization: `Token ${fields.apiKey}` },
          });
          if (!response.ok) return { ok: false, message: `Vapi API failed with status ${response.status}` };
          return { ok: true, message: 'Vapi API key is valid.' };
        }
        case 'apollo': {
          const result = await apollo.enrichPerson({ email: 'test@example.com' }, { apiKey: fields.apiKey });
          return { ok: true, message: result ? 'Apollo returned a match.' : 'Apollo API key is valid.' };
        }
        case 'google-meet':
          return { ok: true, message: 'Google Meet uses a pre-provisioned static link; no credentials to test.' };
        default:
          return { ok: false, message: `Unknown provider "${provider}".` };
      }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  };
}
