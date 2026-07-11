import { createLeadFromInput, detectSpam, ConsentRequiredError } from '../src/modules/leadIntake';
import { RawLeadInput } from '../src/types/domain';

function baseInput(overrides: Partial<RawLeadInput> = {}): RawLeadInput {
  return {
    fullName: 'Sara Ahmadi',
    phone: '09121234567',
    email: 'sara@example.com',
    channel: 'instagram',
    message: 'I am interested in booking a presentation session.',
    utm: { source: 'instagram', campaign: 'spring-promo' },
    consent: 'granted',
    formRenderedAt: 1000,
    submittedAt: 5000,
    ...overrides,
  };
}

describe('leadIntake', () => {
  it('creates a normalized lead from valid input', () => {
    const lead = createLeadFromInput(baseInput());
    expect(lead.fullName).toBe('Sara Ahmadi');
    expect(lead.normalizedPhone).toBe('+989121234567');
    expect(lead.isSpam).toBe(false);
    expect(lead.consent).toBe('granted');
  });

  it('throws ConsentRequiredError when consent is not granted', () => {
    expect(() => createLeadFromInput(baseInput({ consent: 'declined' }))).toThrow(ConsentRequiredError);
  });

  it('flags honeypot-filled submissions as spam', () => {
    const result = detectSpam(baseInput({ honeypot: 'bot-filled-this' }));
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain('honeypot-filled');
  });

  it('flags too-fast submissions as spam', () => {
    const result = detectSpam(baseInput({ formRenderedAt: 1000, submittedAt: 1200 }));
    expect(result.isSpam).toBe(true);
    expect(result.reasons).toContain('too-fast-submission');
  });

  it('does not flag a normal, human-paced submission as spam', () => {
    const result = detectSpam(baseInput());
    expect(result.isSpam).toBe(false);
  });

  it('marks lead as spam but still creates it when storeSpamLeads is true (default)', () => {
    const lead = createLeadFromInput(baseInput({ honeypot: 'x' }));
    expect(lead.isSpam).toBe(true);
  });
});
