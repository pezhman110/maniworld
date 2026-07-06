import { buildParentCitySummary, DEFAULT_PARENT_PIN, ParentPinRegistry } from '../src/modules/parentView';

describe('ParentPinRegistry', () => {
  it('defaults to PIN 1234 when no custom PIN has been set', () => {
    const registry = new ParentPinRegistry();
    expect(registry.verify('city_1', DEFAULT_PARENT_PIN)).toBe(true);
    expect(registry.verify('city_1', '0000')).toBe(false);
  });

  it('allows configuring a custom PIN', () => {
    const registry = new ParentPinRegistry();
    registry.setPin('city_1', '5678');
    expect(registry.verify('city_1', '5678')).toBe(true);
    expect(registry.verify('city_1', DEFAULT_PARENT_PIN)).toBe(false);
  });

  it('rejects PINs shorter than 4 digits', () => {
    const registry = new ParentPinRegistry();
    expect(() => registry.setPin('city_1', '12')).toThrow();
  });
});

describe('buildParentCitySummary', () => {
  it('emits a soft nudge when 50% or more residents have a hard mood', () => {
    const summary = buildParentCitySummary('city_1', { residents: 4, buildings: 3, events: 1, hardMoodResidentRatio: 0.5 });
    expect(summary.softNudge).toBeDefined();
  });

  it('does not emit a nudge below the 50% threshold', () => {
    const summary = buildParentCitySummary('city_1', { residents: 4, buildings: 3, events: 1, hardMoodResidentRatio: 0.25 });
    expect(summary.softNudge).toBeUndefined();
  });
});
