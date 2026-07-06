import { ChildProfile } from '../types/domain';

/**
 * Child profile module.
 *
 * Holds the minimal identity + birth date needed to compute the child's
 * current age band (see `ageBands.ts`). Kept intentionally small: this game
 * does not need or store any other personal data, per the safety guidance
 * (COPPA/GDPR-K) called out in the plan.
 */
export class ChildProfileRegistry {
  private profiles = new Map<string, ChildProfile>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `child_${Date.now()}_${this.sequence}`;
  }

  create(input: { displayName: string; birthDate: string; parentContactId: string }): ChildProfile {
    const profile: ChildProfile = {
      id: this.nextId(),
      displayName: input.displayName,
      birthDate: input.birthDate,
      parentContactId: input.parentContactId,
      createdAt: Date.now(),
    };
    this.profiles.set(profile.id, profile);
    return profile;
  }

  getById(childId: string): ChildProfile | undefined {
    return this.profiles.get(childId);
  }

  list(): ChildProfile[] {
    return [...this.profiles.values()];
  }
}
