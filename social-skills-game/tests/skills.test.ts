import { SkillRegistry } from '../src/modules/skills';

describe('SkillRegistry', () => {
  const registry = new SkillRegistry();

  it('seeds the 10 baseline 6-9 social skills requested', () => {
    const baseline = registry.forBand('kids-6-9');
    expect(baseline).toHaveLength(10);
    expect(baseline.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'greet-and-introduce',
        'active-listening',
        'sharing-turn-taking',
        'emotional-expression',
        'help-seeking-and-helping',
        'apology-and-accountability',
        'simple-empathy',
        'friendship-building',
        'frustration-management',
        'group-rules',
      ])
    );
  });

  it('accumulates skills for higher bands instead of replacing them', () => {
    const kidsCount = registry.forBand('kids-6-9').length;
    const tweensCount = registry.forBand('tweens-10-12').length;

    const cumulativeTweens = registry.cumulativeForBand('tweens-10-12');
    expect(cumulativeTweens).toHaveLength(kidsCount + tweensCount);

    const cumulativeAdult = registry.cumulativeForBand('young-adult-16-plus');
    expect(cumulativeAdult.length).toBeGreaterThan(cumulativeTweens.length);
    // every kids-6-9 skill must still be present in the most advanced band
    const kidsSkillIds = registry.forBand('kids-6-9').map((s) => s.id);
    const adultSkillIds = new Set(cumulativeAdult.map((s) => s.id));
    for (const id of kidsSkillIds) {
      expect(adultSkillIds.has(id)).toBe(true);
    }
  });

  it('getById finds a known skill and returns undefined for unknown ids', () => {
    expect(registry.getById('greet-and-introduce')?.title).toContain('Hello');
    expect(registry.getById('does-not-exist')).toBeUndefined();
  });
});
