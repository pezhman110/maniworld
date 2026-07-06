import { AgeBandRegistry, UnmatchedAgeBandError } from '../src/modules/ageAdaptation';

describe('AgeBandRegistry', () => {
  it('resolves each age 6-9 to its own band', () => {
    const registry = new AgeBandRegistry();
    expect(registry.resolveForAge(6).id).toBe('age-6');
    expect(registry.resolveForAge(9).id).toBe('age-9');
  });

  it('throws for an unconfigured age', () => {
    const registry = new AgeBandRegistry();
    expect(() => registry.resolveForAge(12)).toThrow(UnmatchedAgeBandError);
  });

  it('cumulatively unlocks features from age 6 to age 9', () => {
    const registry = new AgeBandRegistry();
    expect(registry.unlockedFeaturesForAge(6)).toEqual(['icon-and-voice-only']);
    expect(registry.unlockedFeaturesForAge(9)).toEqual(
      expect.arrayContaining(['icon-and-voice-only', 'simple-single-step-commands', 'conditionals-and-loops', 'team-projects-and-detailed-reports'])
    );
  });

  it('hasFeature reflects unlocked features per age', () => {
    const registry = new AgeBandRegistry();
    expect(registry.hasFeature(6, 'conditionals-and-loops')).toBe(false);
    expect(registry.hasFeature(8, 'conditionals-and-loops')).toBe(true);
  });
});
