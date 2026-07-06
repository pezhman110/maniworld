import {
  CharacterConceptRegistry,
  InvalidConceptTransitionError,
  MAX_TYPE_OPTIONS,
  MIN_TYPE_OPTIONS,
} from '../src/modules/characterConcept';

function sevenOptions() {
  return Array.from({ length: 7 }, (_, i) => ({ label: `Type ${i}`, description: `Description ${i}` }));
}

describe('CharacterConceptRegistry', () => {
  it('starts a concept as pending-generation from a text description', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    expect(concept.status).toBe('pending-generation');
    expect(concept.inputMode).toBe('text');
  });

  it('supports voice-mode descriptions', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat', 'voice', 'voicenote_1');
    expect(concept.inputMode).toBe('voice');
    expect(concept.voiceNoteId).toBe('voicenote_1');
  });

  it('moves pending-generation -> generated once AI artwork is ready', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    const updated = registry.markGenerated(concept.id, 'asset://art-1');
    expect(updated.status).toBe('generated');
    expect(updated.imageAssetRef).toBe('asset://art-1');
  });

  it('supports a revision loop: generated -> needs regeneration -> generated -> approved', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    registry.markGenerated(concept.id, 'asset://art-1');

    const revised = registry.requestRevision(concept.id, 'make the cape red');
    expect(revised.status).toBe('pending-generation');
    expect(revised.revisionNotes).toEqual(['make the cape red']);

    registry.markGenerated(concept.id, 'asset://art-2');
    const approved = registry.approve(concept.id);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeDefined();
  });

  it('rejects approving before artwork has been generated', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    expect(() => registry.approve(concept.id)).toThrow(InvalidConceptTransitionError);
  });

  it('offers between 7 and 10 type options only once approved', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    expect(() => registry.offerTypeOptions(concept.id, sevenOptions())).toThrow(InvalidConceptTransitionError);

    registry.markGenerated(concept.id, 'asset://art-1');
    registry.approve(concept.id);

    const options = registry.offerTypeOptions(concept.id, sevenOptions());
    expect(options.length).toBeGreaterThanOrEqual(MIN_TYPE_OPTIONS);
    expect(options.length).toBeLessThanOrEqual(MAX_TYPE_OPTIONS);
  });

  it('rejects offering fewer than 7 or more than 10 type options', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    registry.markGenerated(concept.id, 'asset://art-1');
    registry.approve(concept.id);

    expect(() => registry.offerTypeOptions(concept.id, sevenOptions().slice(0, 3))).toThrow(InvalidConceptTransitionError);
  });

  it('lets the child choose one of the offered types', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    registry.markGenerated(concept.id, 'asset://art-1');
    registry.approve(concept.id);
    const options = registry.offerTypeOptions(concept.id, sevenOptions());

    const updated = registry.chooseType(concept.id, options[2].id);
    expect(updated.chosenTypeOptionId).toBe(options[2].id);
  });

  it('rejects choosing a type that was not offered', () => {
    const registry = new CharacterConceptRegistry();
    const concept = registry.describe('child_1', 'A flying blue cat');
    registry.markGenerated(concept.id, 'asset://art-1');
    registry.approve(concept.id);
    registry.offerTypeOptions(concept.id, sevenOptions());

    expect(() => registry.chooseType(concept.id, 'not-a-real-option')).toThrow(InvalidConceptTransitionError);
  });
});
