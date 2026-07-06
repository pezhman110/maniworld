import { CharacterHabitat } from '../types/domain';

/**
 * Habitat module (step 4).
 *
 * The child describes where the character lives; the same AI-artwork review
 * cycle applies (approve as-is, or request a revision). At the end the flow
 * asks a plain yes/no: "do you want a home for this character?" — "yes"
 * moves on to the next character in the roster, "no" simply closes out this
 * character with whatever has been built so far (the character is still
 * saved).
 */
export class UnknownHabitatError extends Error {
  constructor(habitatId: string) {
    super(`Unknown character habitat id: ${habitatId}`);
    this.name = 'UnknownHabitatError';
  }
}

export class InvalidHabitatTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidHabitatTransitionError';
  }
}

export class HabitatRegistry {
  private habitats = new Map<string, CharacterHabitat>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `habitat_${Date.now()}_${this.sequence}`;
  }

  describe(characterId: string, description: string, createdAt: number = Date.now()): CharacterHabitat {
    const habitat: CharacterHabitat = {
      id: this.nextId(),
      characterId,
      description,
      status: 'pending-generation',
      revisionNotes: [],
      createdAt,
    };
    this.habitats.set(habitat.id, habitat);
    return habitat;
  }

  markGenerated(habitatId: string, imageAssetRef: string): CharacterHabitat {
    const habitat = this.getById(habitatId);
    if (habitat.status !== 'pending-generation') {
      throw new InvalidHabitatTransitionError(
        `Habitat ${habitatId} must be "pending-generation" before it can be marked generated (was "${habitat.status}").`
      );
    }
    habitat.status = 'generated';
    habitat.imageAssetRef = imageAssetRef;
    return habitat;
  }

  requestRevision(habitatId: string, note: string): CharacterHabitat {
    const habitat = this.getById(habitatId);
    if (habitat.status !== 'generated') {
      throw new InvalidHabitatTransitionError(
        `Habitat ${habitatId} must be "generated" before a revision can be requested (was "${habitat.status}").`
      );
    }
    habitat.revisionNotes.push(note);
    habitat.status = 'pending-generation';
    return habitat;
  }

  approve(habitatId: string): CharacterHabitat {
    const habitat = this.getById(habitatId);
    if (habitat.status !== 'generated') {
      throw new InvalidHabitatTransitionError(
        `Habitat ${habitatId} must be "generated" before it can be approved (was "${habitat.status}").`
      );
    }
    habitat.status = 'approved';
    return habitat;
  }

  /**
   * "Do you want a home for this character?" answer. Returns `'next-character'`
   * when the child said yes (move on to building another character) or
   * `'character-closed'` when they said no (this character is done, as-is).
   */
  decideWantsHabitat(habitatId: string, wantsHabitat: boolean): 'next-character' | 'character-closed' {
    const habitat = this.getById(habitatId);
    habitat.wantsHabitat = wantsHabitat;
    return wantsHabitat ? 'next-character' : 'character-closed';
  }

  getById(habitatId: string): CharacterHabitat {
    const habitat = this.habitats.get(habitatId);
    if (!habitat) {
      throw new UnknownHabitatError(habitatId);
    }
    return habitat;
  }

  habitatsForCharacter(characterId: string): CharacterHabitat[] {
    return [...this.habitats.values()].filter((habitat) => habitat.characterId === characterId);
  }
}
