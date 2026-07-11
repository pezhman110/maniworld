import { tierForCompletions, completionsToNextTier } from '../src/modules/badges';

describe('badge tiers', () => {
  it('has no tier before the first successful completion', () => {
    expect(tierForCompletions(0)).toBeUndefined();
  });

  it('reaches bronze at 1, silver at 3, gold at 6', () => {
    expect(tierForCompletions(1)).toBe('bronze');
    expect(tierForCompletions(2)).toBe('bronze');
    expect(tierForCompletions(3)).toBe('silver');
    expect(tierForCompletions(5)).toBe('silver');
    expect(tierForCompletions(6)).toBe('gold');
    expect(tierForCompletions(10)).toBe('gold');
  });

  it('computes completions remaining to the next tier', () => {
    expect(completionsToNextTier(0)).toBe(1);
    expect(completionsToNextTier(1)).toBe(2);
    expect(completionsToNextTier(3)).toBe(3);
    expect(completionsToNextTier(6)).toBeUndefined();
  });
});
