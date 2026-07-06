import { AgeBandRegistry, computeAge, UnmatchedAgeBandError } from '../src/modules/ageBands';

describe('computeAge', () => {
  it('computes age before the birthday this year', () => {
    expect(computeAge('2016-08-15', new Date('2026-07-01'))).toBe(9);
  });

  it('computes age on/after the birthday this year', () => {
    expect(computeAge('2016-08-15', new Date('2026-08-15'))).toBe(10);
    expect(computeAge('2016-08-15', new Date('2026-09-01'))).toBe(10);
  });

  it('throws for an invalid birth date', () => {
    expect(() => computeAge('not-a-date')).toThrow('Invalid birth date');
  });
});

describe('AgeBandRegistry', () => {
  const registry = new AgeBandRegistry();

  it('resolves the baseline 6-9 band', () => {
    expect(registry.resolveForAge(6).id).toBe('kids-6-9');
    expect(registry.resolveForAge(9).id).toBe('kids-6-9');
  });

  it('resolves higher bands as age increases', () => {
    expect(registry.resolveForAge(10).id).toBe('tweens-10-12');
    expect(registry.resolveForAge(13).id).toBe('teens-13-15');
    expect(registry.resolveForAge(16).id).toBe('young-adult-16-plus');
    expect(registry.resolveForAge(40).id).toBe('young-adult-16-plus');
  });

  it('throws for an age with no configured band', () => {
    expect(() => registry.resolveForAge(3)).toThrow(UnmatchedAgeBandError);
  });

  it('bandsUpTo returns bands in ascending order including the target band', () => {
    const bands = registry.bandsUpTo('teens-13-15');
    expect(bands.map((b) => b.id)).toEqual(['kids-6-9', 'tweens-10-12', 'teens-13-15']);
  });

  it('nextBand returns the following band, or undefined for the last band', () => {
    expect(registry.nextBand('kids-6-9')?.id).toBe('tweens-10-12');
    expect(registry.nextBand('young-adult-16-plus')).toBeUndefined();
  });
});
