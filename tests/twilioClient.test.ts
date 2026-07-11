import { TwilioPhoneValidator } from '../src/modules/integrationClients/twilioClient';

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): typeof fetch {
  return impl as unknown as typeof fetch;
}

describe('TwilioPhoneValidator', () => {
  it('falls back to local regex validation when no credentials are provided', async () => {
    const validator = new TwilioPhoneValidator();
    const result = await validator.validate('09123456789');

    expect(result.source).toBe('local-regex-fallback');
    expect(result.valid).toBe(true);
    expect(result.phone).toBe('+989123456789');
  });

  it('calls the Twilio Lookup API and returns line type/carrier when credentials are configured', async () => {
    const fetchImpl = mockFetch(async () =>
      new Response(
        JSON.stringify({ valid: true, line_type_intelligence: { type: 'mobile', carrier_name: 'MCI' } }),
        { status: 200 }
      )
    );
    const validator = new TwilioPhoneValidator(fetchImpl);

    const result = await validator.validate('09123456789', { accountSid: 'ACxxx', authToken: 'token' });

    expect(result.source).toBe('twilio-lookup');
    expect(result.valid).toBe(true);
    expect(result.lineType).toBe('mobile');
    expect(result.carrierName).toBe('MCI');
  });

  it('falls back to local regex when the Twilio API call fails', async () => {
    const fetchImpl = mockFetch(async () => new Response('error', { status: 500 }));
    const validator = new TwilioPhoneValidator(fetchImpl);

    const result = await validator.validate('09123456789', { accountSid: 'ACxxx', authToken: 'token' });

    expect(result.source).toBe('local-regex-fallback');
    expect(result.error).toBeDefined();
    expect(result.valid).toBe(true);
  });
});
