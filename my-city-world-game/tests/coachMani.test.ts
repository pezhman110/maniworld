import { CoachManiRegistry } from '../src/modules/coachMani';

describe('CoachManiRegistry', () => {
  it('produces a locale-complete tip with the little-architect mascot for each trigger', () => {
    const registry = new CoachManiRegistry();
    const tip = registry.tipFor('added-resident');
    expect(tip.mascot.variant).toBe('little-architect');
    expect(tip.message.fa).toBeTruthy();
    expect(tip.message.ar).toBeTruthy();
    expect(tip.message.en).toBeTruthy();
  });

  it('keeps a history of tips shown', () => {
    const registry = new CoachManiRegistry();
    registry.tipFor('built-zone');
    registry.tipFor('placed-item');
    expect(registry.history()).toHaveLength(2);
  });
});
