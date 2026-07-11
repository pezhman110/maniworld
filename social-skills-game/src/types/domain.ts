/**
 * Domain types for the Social Skills Game.
 *
 * This is a standalone product (kids' social/character-skills game with viral
 * growth mechanics). It intentionally lives in its own top-level project
 * (`social-skills-game/`) with its own package.json/tsconfig/jest config, so
 * it never gets built, tested, or deployed together with the unrelated
 * maniworld CRM in `src/`.
 */

/**
 * Age bands the game scales through. Each band unlocks its own skill set on
 * top of (not instead of) every earlier band's skills, matching the request
 * that higher ages get MORE skills, not a swapped-out list.
 *
 * Bands are data, not hardcoded logic — see `AgeBandRegistry` in
 * `modules/ageBands.ts`, mirroring the same "rules separated from engine"
 * pattern the CRM repo uses for `MarketTargetRule`.
 */
export type AgeBandId = 'kids-6-9' | 'tweens-10-12' | 'teens-13-15' | 'young-adult-16-plus';

export interface AgeBandRule {
  id: AgeBandId;
  label: string;
  /** Inclusive lower bound in years. */
  minAge: number;
  /** Inclusive upper bound in years, or undefined for "and up" (16+). */
  maxAge?: number;
  /** Short celebratory copy shown to the child/parent on transition into this band. */
  transitionMessage: string;
}

export type SkillCategory =
  | 'greeting-and-introduction'
  | 'active-listening'
  | 'sharing-and-turn-taking'
  | 'emotional-expression'
  | 'help-seeking-and-helping'
  | 'apology-and-accountability'
  | 'empathy'
  | 'friendship-building'
  | 'frustration-management'
  | 'group-rules'
  | 'conflict-resolution'
  | 'negotiation'
  | 'teamwork'
  | 'peer-pressure-management'
  | 'bullying-awareness'
  | 'digital-communication'
  | 'healthy-boundaries'
  | 'complex-emotion-regulation'
  | 'small-group-leadership'
  | 'interview-and-presentation'
  | 'advanced-emotional-intelligence'
  | 'team-conflict-management'
  | 'cross-cultural-communication';

export interface Skill {
  id: string;
  ageBandId: AgeBandId;
  category: SkillCategory;
  title: string;
  /** One-sentence description of what mastering this skill looks like. */
  description: string;
}

export type BadgeTier = 'bronze' | 'silver' | 'gold';

/** Number of successful quest completions required to reach each badge tier. */
export const BADGE_TIER_THRESHOLDS: Record<BadgeTier, number> = {
  bronze: 1,
  silver: 3,
  gold: 6,
};

export interface ChildProfile {
  id: string;
  displayName: string;
  birthDate: string; // ISO date (YYYY-MM-DD)
  parentContactId: string;
  createdAt: number;
}

export interface SkillProgress {
  childId: string;
  skillId: string;
  successfulCompletions: number;
  tier?: BadgeTier;
  lastPracticedAt?: number;
}

export type QuestOutcome = 'success' | 'retry' | 'skipped';

export interface QuestAttempt {
  childId: string;
  skillId: string;
  outcome: QuestOutcome;
  playedAt: number;
}

/** A detected transition from one age band to the next for a given child. */
export interface AgeBandTransitionEvent {
  childId: string;
  fromBandId?: AgeBandId;
  toBandId: AgeBandId;
  detectedAt: number;
  newlyUnlockedSkillIds: string[];
  message: string;
}

export type InviteRewardKind = 'avatar-item' | 'avatar-level';

export interface InviteReward {
  kind: InviteRewardKind;
  itemId: string;
  label: string;
}

export interface InviteCode {
  code: string;
  inviterChildId: string;
  createdAt: number;
  /** Reward granted to BOTH inviter and invitee once the invite is redeemed. */
  reward: InviteReward;
  redeemedByChildId?: string;
  redeemedAt?: number;
}

export interface GroupChallenge {
  id: string;
  title: string;
  skillId: string;
  createdByParentOrTeacherId: string;
  /** Minimum number of joined members needed to "activate" the group challenge. */
  memberThreshold: number;
  memberChildIds: string[];
  createdAt: number;
  activatedAt?: number;
}

export interface ParentProgressReport {
  childId: string;
  generatedAt: number;
  currentAgeBandId: AgeBandId;
  skillsInProgress: Array<{ skillId: string; title: string; tier?: BadgeTier; completions: number }>;
  skillsMastered: Array<{ skillId: string; title: string }>;
  homePracticeSuggestions: string[];
}
