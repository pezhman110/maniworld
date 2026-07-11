import { isValidPhoneFormat, normalizePhone } from '../phoneValidation';

/**
 * Twilio Lookup adapter.
 *
 * Wraps the existing local-regex `phoneValidation.ts` module: when Twilio
 * credentials are configured, it also calls the real Twilio Lookup v2 API to
 * confirm the number is a real, reachable line (and its line type/carrier).
 * If no credentials are configured, or the API call fails, it transparently
 * falls back to the local regex check so validation never hard-fails.
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
}

export type PhoneValidationSource = 'twilio-lookup' | 'local-regex-fallback';

export interface PhoneValidationResult {
  phone: string;
  valid: boolean;
  lineType?: string;
  carrierName?: string;
  source: PhoneValidationSource;
  error?: string;
}

type FetchLike = typeof fetch;

export class TwilioPhoneValidator {
  constructor(private readonly fetchImpl: FetchLike = fetch) {}

  /** Validates a phone number, using Twilio Lookup when credentials are supplied. */
  async validate(rawPhone: string, credentials?: TwilioCredentials): Promise<PhoneValidationResult> {
    const normalized = normalizePhone(rawPhone);

    if (!credentials) {
      return { phone: normalized, valid: isValidPhoneFormat(rawPhone), source: 'local-regex-fallback' };
    }

    try {
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(
        normalized
      )}?Fields=line_type_intelligence`;
      const auth = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64');
      const response = await this.fetchImpl(url, { headers: { Authorization: `Basic ${auth}` } });

      if (!response.ok) {
        throw new Error(`Twilio Lookup responded with status ${response.status}`);
      }

      const body = (await response.json()) as {
        valid?: boolean;
        line_type_intelligence?: { type?: string; carrier_name?: string };
      };

      return {
        phone: normalized,
        valid: body.valid !== false,
        lineType: body.line_type_intelligence?.type,
        carrierName: body.line_type_intelligence?.carrier_name,
        source: 'twilio-lookup',
      };
    } catch (err) {
      return {
        phone: normalized,
        valid: isValidPhoneFormat(rawPhone),
        source: 'local-regex-fallback',
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
