import { assertUsesDesignToken, directionFor, mascotForMyCity } from '../src/modules/platformRules';

describe('platformRules', () => {
  it('rejects a hardcoded style literal', () => {
    expect(() => assertUsesDesignToken('#ff0000')).toThrow();
  });

  it('accepts a design token reference', () => {
    expect(assertUsesDesignToken({ token: 'color.brand.primary' })).toEqual({ token: 'color.brand.primary' });
  });

  it('returns the little-architect Mani mascot for this module', () => {
    expect(mascotForMyCity().variant).toBe('little-architect');
  });

  it('maps fa/ar to rtl and en to ltr', () => {
    expect(directionFor('fa')).toBe('rtl');
    expect(directionFor('ar')).toBe('rtl');
    expect(directionFor('en')).toBe('ltr');
  });
});
