import { CharacterConceptRegistry } from '../src/modules/characterConcept';
import {
  CharacterTraitsRegistry,
  RosterLimitExceededError,
  InvalidCharacterStateError,
} from '../src/modules/characterTraits';

function approvedConceptWithType(concepts: CharacterConceptRegistry, creatorId: string) {
  const concept = concepts.describe(creatorId, 'A brave little fox');
  concepts.markGenerated(concept.id, 'asset://art-1');
  concepts.approve(concept.id);
  const options = concepts.offerTypeOptions(
    concept.id,
    Array.from({ length: 7 }, (_, i) => ({ label: `Type ${i}`, description: `Description ${i}` }))
  );
  concepts.chooseType(concept.id, options[0].id);
  return concept;
}

describe('CharacterTraitsRegistry', () => {
  it('creates a character with gender from an approved concept with a chosen type', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    const concept = approvedConceptWithType(concepts, 'child_1');

    const character = traits.create(concept.id, 'girl');
    expect(character.gender).toBe('girl');
    expect(character.creatorId).toBe('child_1');
    expect(character.typeOptionId).toBe(concept.chosenTypeOptionId);
  });

  it('rejects creating a character before the concept is approved with a chosen type', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    const concept = concepts.describe('child_1', 'A brave little fox');

    expect(() => traits.create(concept.id, 'boy')).toThrow(InvalidCharacterStateError);
  });

  it('records powers with description, effect and activation condition', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    const concept = approvedConceptWithType(concepts, 'child_1');
    const character = traits.create(concept.id, 'boy');

    const power = traits.addPower(character.id, 'glowing fists', 'smashes rocks', 'turns on when he claps twice');
    expect(traits.powersFor(character.id)).toEqual([power]);
  });

  it('enforces the roster cap (default 5) per creator', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts, { maxCharactersPerCreator: 2 });

    const first = approvedConceptWithType(concepts, 'child_1');
    traits.create(first.id, 'girl');
    const second = approvedConceptWithType(concepts, 'child_1');
    traits.create(second.id, 'boy');

    expect(traits.remainingRosterSlots('child_1')).toBe(0);

    const third = approvedConceptWithType(concepts, 'child_1');
    expect(() => traits.create(third.id, 'girl')).toThrow(RosterLimitExceededError);
  });

  it('tracks remaining roster slots correctly as characters are added', () => {
    const concepts = new CharacterConceptRegistry();
    const traits = new CharacterTraitsRegistry(concepts);
    expect(traits.remainingRosterSlots('child_1')).toBe(5);

    const concept = approvedConceptWithType(concepts, 'child_1');
    traits.create(concept.id, 'girl');
    expect(traits.remainingRosterSlots('child_1')).toBe(4);
  });
});
