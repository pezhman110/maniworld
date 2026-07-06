import { CharacterConceptRegistry } from './characterConcept';
import {
  Character,
  CharacterGender,
  CharacterPower,
  DEFAULT_ROSTER_LIMIT,
  RosterLimitConfig,
} from '../types/domain';

/**
 * Character traits module (step 2).
 *
 * Once a concept is approved and a type chosen, the child finalizes the
 * character: pick a gender, then describe one or more "energies"/powers —
 * what the power looks like, what it does, and when/how it turns on. The
 * total roster per creator is capped (default 5, shown at the top of the
 * screen) so the whole flow stays bite-sized; the cap is configurable so it
 * can be raised later via an upgrade/subscription tier.
 */
export class UnknownCharacterError extends Error {
  constructor(characterId: string) {
    super(`Unknown character id: ${characterId}`);
    this.name = 'UnknownCharacterError';
  }
}

export class RosterLimitExceededError extends Error {
  constructor(creatorId: string, limit: number) {
    super(`Creator ${creatorId} already has ${limit} characters, the current roster cap.`);
    this.name = 'RosterLimitExceededError';
  }
}

export class InvalidCharacterStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCharacterStateError';
  }
}

export class CharacterTraitsRegistry {
  private characters = new Map<string, Character>();
  private powers = new Map<string, CharacterPower[]>();
  private sequence = 0;
  private readonly limitConfig: RosterLimitConfig;

  constructor(private readonly concepts: CharacterConceptRegistry, limitConfig: RosterLimitConfig = DEFAULT_ROSTER_LIMIT) {
    this.limitConfig = limitConfig;
  }

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  /** How many more characters this creator may still build (>= 0). */
  remainingRosterSlots(creatorId: string): number {
    const used = this.charactersForCreator(creatorId).length;
    return Math.max(0, this.limitConfig.maxCharactersPerCreator - used);
  }

  /** Finalizes a character from an approved concept + chosen type, with gender and creator id. */
  create(conceptId: string, gender: CharacterGender, createdAt: number = Date.now()): Character {
    const concept = this.concepts.getById(conceptId);
    if (concept.status !== 'approved' || !concept.chosenTypeOptionId) {
      throw new InvalidCharacterStateError(
        `Concept ${conceptId} must be approved and have a chosen type before a character can be created.`
      );
    }
    const remaining = this.remainingRosterSlots(concept.creatorId);
    if (remaining <= 0) {
      throw new RosterLimitExceededError(concept.creatorId, this.limitConfig.maxCharactersPerCreator);
    }
    const character: Character = {
      id: this.nextId('character'),
      conceptId,
      creatorId: concept.creatorId,
      typeOptionId: concept.chosenTypeOptionId,
      gender,
      createdAt,
    };
    this.characters.set(character.id, character);
    return character;
  }

  addPower(characterId: string, description: string, effect: string, activationCondition: string): CharacterPower {
    this.getById(characterId);
    const power: CharacterPower = {
      id: this.nextId('power'),
      characterId,
      description,
      effect,
      activationCondition,
    };
    const list = this.powers.get(characterId) ?? [];
    list.push(power);
    this.powers.set(characterId, list);
    return power;
  }

  powersFor(characterId: string): CharacterPower[] {
    return this.powers.get(characterId) ?? [];
  }

  getById(characterId: string): Character {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new UnknownCharacterError(characterId);
    }
    return character;
  }

  charactersForCreator(creatorId: string): Character[] {
    return [...this.characters.values()].filter((character) => character.creatorId === creatorId);
  }
}
