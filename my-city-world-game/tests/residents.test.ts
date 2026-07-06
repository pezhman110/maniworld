import { ResidentRegistry, validateNickname } from '../src/modules/residents';

describe('ResidentRegistry', () => {
  it('adds a resident with a short nickname', () => {
    const registry = new ResidentRegistry();
    const resident = registry.add('city_1', 'person', 'Sara', 'avatar_1', 'happy', { role: 'neighbor' });
    expect(resident.nickname).toBe('Sara');
    expect(resident.kind).toBe('person');
  });

  it('rejects a full name that looks like first+last name', () => {
    expect(validateNickname('Sara Ahmadi')).toBeDefined();
  });

  it('rejects nicknames with address-like hints', () => {
    expect(validateNickname('house12')).toBeDefined();
  });

  it('throws when registering a resident with a rejected nickname', () => {
    const registry = new ResidentRegistry();
    expect(() => registry.add('city_1', 'person', 'Sara Ahmadi', 'avatar_1', 'happy')).toThrow();
  });

  it('computes the hard-mood ratio across a city', () => {
    const registry = new ResidentRegistry();
    registry.add('city_1', 'person', 'Sara', 'a1', 'hard');
    registry.add('city_1', 'person', 'Mo', 'a2', 'happy');
    expect(registry.hardMoodRatio('city_1')).toBeCloseTo(0.5);
  });

  it('returns zero hard-mood ratio for a city with no residents', () => {
    const registry = new ResidentRegistry();
    expect(registry.hardMoodRatio('empty_city')).toBe(0);
  });
});
