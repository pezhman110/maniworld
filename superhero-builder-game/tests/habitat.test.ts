import { HabitatRegistry, InvalidHabitatTransitionError } from '../src/modules/habitat';

describe('HabitatRegistry', () => {
  it('moves a habitat through pending-generation -> generated -> approved', () => {
    const registry = new HabitatRegistry();
    const habitat = registry.describe('character_1', 'a treehouse in a jungle');
    expect(habitat.status).toBe('pending-generation');

    registry.markGenerated(habitat.id, 'asset://habitat-1');
    const approved = registry.approve(habitat.id);
    expect(approved.status).toBe('approved');
  });

  it('supports a revision loop before approval', () => {
    const registry = new HabitatRegistry();
    const habitat = registry.describe('character_1', 'a treehouse in a jungle');
    registry.markGenerated(habitat.id, 'asset://habitat-1');

    const revised = registry.requestRevision(habitat.id, 'add a slide');
    expect(revised.status).toBe('pending-generation');
    expect(revised.revisionNotes).toEqual(['add a slide']);

    registry.markGenerated(habitat.id, 'asset://habitat-2');
    const approved = registry.approve(habitat.id);
    expect(approved.status).toBe('approved');
  });

  it('rejects approving before artwork has been generated', () => {
    const registry = new HabitatRegistry();
    const habitat = registry.describe('character_1', 'a treehouse in a jungle');
    expect(() => registry.approve(habitat.id)).toThrow(InvalidHabitatTransitionError);
  });

  it('returns "next-character" when the child wants a habitat', () => {
    const registry = new HabitatRegistry();
    const habitat = registry.describe('character_1', 'a treehouse in a jungle');
    const outcome = registry.decideWantsHabitat(habitat.id, true);
    expect(outcome).toBe('next-character');
    expect(registry.getById(habitat.id).wantsHabitat).toBe(true);
  });

  it('returns "character-closed" when the child does not want a habitat', () => {
    const registry = new HabitatRegistry();
    const habitat = registry.describe('character_1', 'a treehouse in a jungle');
    const outcome = registry.decideWantsHabitat(habitat.id, false);
    expect(outcome).toBe('character-closed');
    expect(registry.getById(habitat.id).wantsHabitat).toBe(false);
  });
});
