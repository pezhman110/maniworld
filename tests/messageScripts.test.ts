import { buildDefaultScriptLibrary, MessageScriptLibrary, computeNextFollowUpTime } from '../src/modules/messageScripts';

describe('messageScripts', () => {
  it('builds a default library with scripts for every stage/channel combo', () => {
    const library = buildDefaultScriptLibrary();
    const firstContact = library.getActiveScripts('first-contact', 'whatsapp');
    expect(firstContact.length).toBeGreaterThan(0);
  });

  it('picks the same variant deterministically for the same seed', () => {
    const library = new MessageScriptLibrary();
    library.addScript({ stage: 'first-contact', channel: 'email', version: 1, variantLabel: 'A', body: 'Variant A', delayHoursFromPreviousStage: 0, active: true });
    library.addScript({ stage: 'first-contact', channel: 'email', version: 1, variantLabel: 'B', body: 'Variant B', delayHoursFromPreviousStage: 0, active: true });

    const first = library.pickVariant('first-contact', 'email', 'lead_123');
    const second = library.pickVariant('first-contact', 'email', 'lead_123');
    expect(first?.id).toBe(second?.id);
  });

  it('returns null when no active scripts match', () => {
    const library = new MessageScriptLibrary();
    expect(library.pickVariant('reminder', 'youtube', 'seed')).toBeNull();
  });

  it('ignores deactivated scripts when picking a variant', () => {
    const library = new MessageScriptLibrary();
    const script = library.addScript({ stage: 'reminder', channel: 'sms' as any, version: 1, variantLabel: 'A', body: 'x', delayHoursFromPreviousStage: 0, active: true });
    library.deactivate(script.id);
    expect(library.pickVariant('reminder', 'sms' as any, 'seed')).toBeNull();
  });

  it('bumping a version creates a new active script and preserves history', () => {
    const library = new MessageScriptLibrary();
    const original = library.addScript({ stage: 'follow-up-1', channel: 'telegram', version: 1, variantLabel: 'A', body: 'old body', delayHoursFromPreviousStage: 24, active: true });
    const bumped = library.bumpVersion(original.id, 'new body');
    expect(bumped?.version).toBe(2);
    expect(bumped?.body).toBe('new body');
    expect(library.all()).toHaveLength(2);
  });

  it('computes the next follow-up time based on script delay', () => {
    const script = { delayHoursFromPreviousStage: 24 } as any;
    const from = 1_000_000;
    expect(computeNextFollowUpTime(script, from)).toBe(from + 24 * 60 * 60 * 1000);
  });
});
