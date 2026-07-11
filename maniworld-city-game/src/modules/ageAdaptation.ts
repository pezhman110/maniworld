import { AgeBandId, AgeBandRule, ComplexityFeature } from '../types/domain';

/**
 * Age-band personalization module.
 *
 * Kids aged 6-9 are NOT treated as one uniform audience: each age unlocks
 * cumulatively more complex interactions (icons/voice-only at 6, up through
 * team projects with detailed reports at 9). Bands are kept as configurable
 * data (a registry), not hardcoded branching logic, mirroring the
 * `AgeBandRegistry` pattern used in `social-skills-game/src/modules/ageBands.ts`.
 */
export const DEFAULT_AGE_BAND_RULES: AgeBandRule[] = [
  {
    id: 'age-6',
    age: 6,
    label: 'Age 6',
    unlockedFeatures: ['icon-and-voice-only'],
    uxNotes: 'Big buttons, familiar icons, full voice-over narration, minimal reading required.',
  },
  {
    id: 'age-7',
    age: 7,
    label: 'Age 7',
    unlockedFeatures: ['icon-and-voice-only', 'simple-single-step-commands'],
    uxNotes: 'Adds simple single-step robot commands (go-to, pick-up, drop-off).',
  },
  {
    id: 'age-8',
    age: 8,
    label: 'Age 8',
    unlockedFeatures: ['icon-and-voice-only', 'simple-single-step-commands', 'conditionals-and-loops'],
    uxNotes: 'Adds `if` and `repeat` blocks to robot coding for sequencing/algorithmic thinking.',
  },
  {
    id: 'age-9',
    age: 9,
    label: 'Age 9',
    unlockedFeatures: [
      'icon-and-voice-only',
      'simple-single-step-commands',
      'conditionals-and-loops',
      'team-projects-and-detailed-reports',
    ],
    uxNotes: 'Adds team-city projects and more detailed growth/news reports.',
  },
];

export class UnmatchedAgeBandError extends Error {
  constructor(age: number) {
    super(`No age band configured for age ${age}. Check AgeBandRegistry rules for gaps.`);
    this.name = 'UnmatchedAgeBandError';
  }
}

export class AgeBandRegistry {
  private rules: AgeBandRule[];

  constructor(rules: AgeBandRule[] = DEFAULT_AGE_BAND_RULES) {
    this.rules = [...rules].sort((a, b) => a.age - b.age);
  }

  list(): AgeBandRule[] {
    return [...this.rules];
  }

  getById(id: AgeBandId): AgeBandRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  resolveForAge(age: number): AgeBandRule {
    const match = this.rules.find((rule) => rule.age === age);
    if (!match) {
      throw new UnmatchedAgeBandError(age);
    }
    return match;
  }

  /** Cumulative feature set unlocked as of a given age (mirrors 6-9 progressive unlocking). */
  unlockedFeaturesForAge(age: number): ComplexityFeature[] {
    return this.resolveForAge(age).unlockedFeatures;
  }

  hasFeature(age: number, feature: ComplexityFeature): boolean {
    return this.unlockedFeaturesForAge(age).includes(feature);
  }
}
