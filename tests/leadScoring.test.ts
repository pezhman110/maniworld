import { createLeadFromInput } from '../src/modules/leadIntake';
import { scoreLead, isPotentialApplicant, applyScoreToLead } from '../src/modules/leadScoring';
import { RawLeadInput } from '../src/types/domain';

function makeLead(overrides: Partial<RawLeadInput> = {}) {
  return createLeadFromInput({
    fullName: 'Reza Karimi',
    phone: '09121234567',
    channel: 'google',
    consent: 'granted',
    formRenderedAt: 0,
    submittedAt: 5000,
    ...overrides,
  });
}

describe('leadScoring', () => {
  it('gives a high-quality lead (strong channel + email + message + utm) a high score', () => {
    const lead = makeLead({
      email: 'reza@example.com',
      message: 'I would like to schedule a presentation about your premium package for my family next week.',
      utm: { source: 'google', campaign: 'brand-search' },
    });
    const breakdown = scoreLead(lead);
    expect(breakdown.total).toBeGreaterThanOrEqual(50);
    expect(isPotentialApplicant(breakdown)).toBe(true);
  });

  it('gives a bare-minimum lead a low score', () => {
    const lead = makeLead({ channel: 'forum' });
    const breakdown = scoreLead(lead);
    expect(isPotentialApplicant(breakdown)).toBe(false);
  });

  it('applyScoreToLead attaches score and breakdown to the lead object', () => {
    const lead = makeLead();
    const scored = applyScoreToLead(lead);
    expect(scored.score).toBeDefined();
    expect(scored.scoreBreakdown?.total).toBe(scored.score);
  });
});
