import { AgeBandId, AgeBandRule } from '../types/domain';

/**
 * Age-band rules module.
 *
 * Age bands are kept as *configurable data* (a registry), not hardcoded
 * branching logic, so a designer can add a new band (e.g. "adults-18-plus")
 * or tweak the boundaries without touching the dashboard/quest engine code.
 * This mirrors the `MarketTargetRule` pattern from the maniworld CRM repo,
 * where target rules are data consumed by a generic engine.
 */
export const DEFAULT_AGE_BAND_RULES: AgeBandRule[] = [
  {
    id: 'kids-6-9',
    label: 'Little Explorers (6-9)',
    minAge: 6,
    maxAge: 9,
    transitionMessage: 'Welcome aboard! Time to learn the basics of being a great friend.',
  },
  {
    id: 'tweens-10-12',
    label: 'Rising Leaders (10-12)',
    minAge: 10,
    maxAge: 12,
    transitionMessage: 'Congratulations! You leveled up to the 10-12 skill world — teamwork and fair conflict-solving await.',
  },
  {
    id: 'teens-13-15',
    label: 'Confident Voices (13-15)',
    minAge: 13,
    maxAge: 15,
    transitionMessage: 'Congratulations! You leveled up to the 13-15 skill world — online communication and healthy boundaries await.',
  },
  {
    id: 'young-adult-16-plus',
    label: 'Future Leaders (16+)',
    minAge: 16,
    maxAge: undefined,
    transitionMessage: 'Congratulations! You leveled up to the 16+ skill world — interviews, presentations, and advanced EQ await.',
  },
];

/** Computes whole-years age from an ISO birth date, as of a given reference date. */
export function computeAge(birthDateIso: string, asOf: Date = new Date()): number {
  const birthDate = new Date(birthDateIso);
  if (Number.isNaN(birthDate.getTime())) {
    throw new Error(`Invalid birth date: ${birthDateIso}`);
  }
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > birthDate.getMonth() ||
    (asOf.getMonth() === birthDate.getMonth() && asOf.getDate() >= birthDate.getDate());
  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }
  return age;
}

export class UnmatchedAgeBandError extends Error {
  constructor(age: number) {
    super(`No age band configured that covers age ${age}. Check AgeBandRegistry rules for gaps.`);
    this.name = 'UnmatchedAgeBandError';
  }
}

/**
 * Registry resolving an age (in years) to its configured band, and exposing
 * the ordered band list so callers can compute "everything unlocked so far".
 */
export class AgeBandRegistry {
  private rules: AgeBandRule[];

  constructor(rules: AgeBandRule[] = DEFAULT_AGE_BAND_RULES) {
    // Keep bands ordered by minAge so ordinal comparisons (band index) are stable.
    this.rules = [...rules].sort((a, b) => a.minAge - b.minAge);
  }

  list(): AgeBandRule[] {
    return [...this.rules];
  }

  getById(id: AgeBandId): AgeBandRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  /** Resolves which band an age falls into. Throws if no band covers it (a config gap). */
  resolveForAge(age: number): AgeBandRule {
    const match = this.rules.find(
      (rule) => age >= rule.minAge && (rule.maxAge === undefined || age <= rule.maxAge)
    );
    if (!match) {
      throw new UnmatchedAgeBandError(age);
    }
    return match;
  }

  /** All bands up to and including the given band, in ascending order (for cumulative unlocking). */
  bandsUpTo(bandId: AgeBandId): AgeBandRule[] {
    const index = this.rules.findIndex((rule) => rule.id === bandId);
    if (index === -1) {
      throw new Error(`Unknown age band id: ${bandId}`);
    }
    return this.rules.slice(0, index + 1);
  }

  /** Returns the band immediately after the given one, or undefined if it's the last band. */
  nextBand(bandId: AgeBandId): AgeBandRule | undefined {
    const index = this.rules.findIndex((rule) => rule.id === bandId);
    if (index === -1 || index === this.rules.length - 1) {
      return undefined;
    }
    return this.rules[index + 1];
  }
}
