import { CharacterConcept, CharacterTypeOption, InputMode } from '../types/domain';

/**
 * Character concept module (step 1).
 *
 * Flow: the child describes an animal/object/character (typed or via a
 * voice note) -> status starts as `pending-generation` -> once the (external)
 * AI image service returns artwork, `markGenerated` moves it to `generated`
 * -> the child reviews it: either `requestRevision` (they say what to
 * change, back to `pending-generation` for a new image) or `approve` (no
 * changes needed). Once approved, the system offers 7-10 suggested
 * character "types" for the child to pick from.
 */
export class UnknownConceptError extends Error {
  constructor(conceptId: string) {
    super(`Unknown character concept id: ${conceptId}`);
    this.name = 'UnknownConceptError';
  }
}

export class InvalidConceptTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConceptTransitionError';
  }
}

export const MIN_TYPE_OPTIONS = 7;
export const MAX_TYPE_OPTIONS = 10;

export class CharacterConceptRegistry {
  private concepts = new Map<string, CharacterConcept>();
  private typeOptions = new Map<string, CharacterTypeOption[]>();
  private sequence = 0;

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  describe(
    creatorId: string,
    description: string,
    inputMode: InputMode = 'text',
    voiceNoteId?: string,
    createdAt: number = Date.now()
  ): CharacterConcept {
    const concept: CharacterConcept = {
      id: this.nextId('concept'),
      creatorId,
      description,
      inputMode,
      voiceNoteId,
      status: 'pending-generation',
      revisionNotes: [],
      createdAt,
    };
    this.concepts.set(concept.id, concept);
    return concept;
  }

  /** Called once the (external) AI image service has produced artwork. */
  markGenerated(conceptId: string, imageAssetRef: string): CharacterConcept {
    const concept = this.getById(conceptId);
    if (concept.status !== 'pending-generation') {
      throw new InvalidConceptTransitionError(
        `Concept ${conceptId} must be "pending-generation" before it can be marked generated (was "${concept.status}").`
      );
    }
    concept.status = 'generated';
    concept.imageAssetRef = imageAssetRef;
    return concept;
  }

  /** The child says what should change; sends it back for a fresh image. */
  requestRevision(conceptId: string, note: string): CharacterConcept {
    const concept = this.getById(conceptId);
    if (concept.status !== 'generated') {
      throw new InvalidConceptTransitionError(
        `Concept ${conceptId} must be "generated" before a revision can be requested (was "${concept.status}").`
      );
    }
    concept.revisionNotes.push(note);
    concept.status = 'pending-generation';
    return concept;
  }

  /** The child says "this is fine, no changes needed." */
  approve(conceptId: string, approvedAt: number = Date.now()): CharacterConcept {
    const concept = this.getById(conceptId);
    if (concept.status !== 'generated') {
      throw new InvalidConceptTransitionError(
        `Concept ${conceptId} must be "generated" before it can be approved (was "${concept.status}").`
      );
    }
    concept.status = 'approved';
    concept.approvedAt = approvedAt;
    return concept;
  }

  /** Offers 7-10 suggested character types once the concept is approved. */
  offerTypeOptions(conceptId: string, labelsAndDescriptions: Array<{ label: string; description: string }>): CharacterTypeOption[] {
    const concept = this.getById(conceptId);
    if (concept.status !== 'approved') {
      throw new InvalidConceptTransitionError(
        `Concept ${conceptId} must be "approved" before type options can be offered (was "${concept.status}").`
      );
    }
    if (labelsAndDescriptions.length < MIN_TYPE_OPTIONS || labelsAndDescriptions.length > MAX_TYPE_OPTIONS) {
      throw new InvalidConceptTransitionError(
        `Must offer between ${MIN_TYPE_OPTIONS} and ${MAX_TYPE_OPTIONS} character type options (got ${labelsAndDescriptions.length}).`
      );
    }
    const options = labelsAndDescriptions.map((entry) => ({
      id: this.nextId('type'),
      conceptId,
      label: entry.label,
      description: entry.description,
    }));
    this.typeOptions.set(conceptId, options);
    return options;
  }

  typeOptionsFor(conceptId: string): CharacterTypeOption[] {
    return this.typeOptions.get(conceptId) ?? [];
  }

  /** The child picks one of the offered character types. */
  chooseType(conceptId: string, typeOptionId: string): CharacterConcept {
    const concept = this.getById(conceptId);
    const options = this.typeOptionsFor(conceptId);
    if (!options.some((option) => option.id === typeOptionId)) {
      throw new InvalidConceptTransitionError(`Type option ${typeOptionId} was not offered for concept ${conceptId}.`);
    }
    concept.chosenTypeOptionId = typeOptionId;
    return concept;
  }

  getById(conceptId: string): CharacterConcept {
    const concept = this.concepts.get(conceptId);
    if (!concept) {
      throw new UnknownConceptError(conceptId);
    }
    return concept;
  }

  conceptsForCreator(creatorId: string): CharacterConcept[] {
    return [...this.concepts.values()].filter((concept) => concept.creatorId === creatorId);
  }
}
