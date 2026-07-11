/**
 * Domain types for ManiWorld: the safe weekly creative-achievement city
 * game for kids aged 6-9.
 *
 * This is a standalone product, kept in its own top-level project
 * (`maniworld-city-game/`) with its own package.json/tsconfig/jest config,
 * so it is never built, tested, or deployed together with the unrelated
 * maniworld CRM in `src/`, or with the other standalone kids' games
 * (`music-studio-game/`, `social-skills-game/`).
 *
 * It follows the same "rules/config separated from engine" and
 * "safety-gated sharing" patterns used by those sibling projects:
 *  - age-band rules are data consumed by a generic engine (ageAdaptation.ts)
 *  - anything shareable must clear ParentalConsent + Moderation first
 *    (parentSafety.ts) before viralOutputs.ts / safeExpo.ts can expose it
 */

/** Individual per-year age bands, since 6/7/8/9 each need a distinct complexity level (per plan section "Age Band Personalization"). */
export type AgeBandId = 'age-6' | 'age-7' | 'age-8' | 'age-9';

export type ComplexityFeature =
  | 'icon-and-voice-only'
  | 'simple-single-step-commands'
  | 'conditionals-and-loops'
  | 'team-projects-and-detailed-reports';

export interface AgeBandRule {
  id: AgeBandId;
  age: number;
  label: string;
  /** Complexity features unlocked at this age (cumulative with earlier ages). */
  unlockedFeatures: ComplexityFeature[];
  /** Short description of the UX adaptation for this age, for designers/QA. */
  uxNotes: string;
}

export interface ChildProfile {
  id: string;
  /** Nickname only — no full legal name is stored (data minimization). */
  nickname: string;
  age: number;
  parentContactId: string;
}

// ---------------------------------------------------------------------------
// My Living Home
// ---------------------------------------------------------------------------

export type LivingHomeRoom =
  | 'painting-wall'
  | 'storybook-shelf'
  | 'city-tv'
  | 'music-piano'
  | 'robot-garage'
  | 'invention-room'
  | 'kindness-garden'
  | 'honor-board'
  | 'city-diary'
  | 'weekly-album';

export interface LivingHomeExhibit {
  id: string;
  childId: string;
  room: LivingHomeRoom;
  title: string;
  /** Reference/URL to the actual media asset; rendering itself is out of scope. */
  mediaRef: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// City Builder
// ---------------------------------------------------------------------------

export type ResourceType = 'water' | 'energy' | 'wood' | 'kindness-points';

export type BuildingType =
  | 'house'
  | 'park'
  | 'library'
  | 'school'
  | 'power-plant'
  | 'recycling-station'
  | 'friendship-tower'
  | 'festival-square'
  | 'garden';

export interface Building {
  id: string;
  type: BuildingType;
  builtAt: number;
  /** 0 (withered) to 100 (thriving) — drives the "city emotions" reactive feedback. */
  health: number;
}

export interface City {
  id: string;
  childId: string;
  name: string;
  resources: Record<ResourceType, number>;
  buildings: Building[];
  greenPercentage: number;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Visual Robot Coding
// ---------------------------------------------------------------------------

export type RobotBlockKind = 'go-to' | 'pick-up' | 'drop-off' | 'if' | 'repeat' | 'wait' | 'help' | 'return';

export interface RobotBlock {
  kind: RobotBlockKind;
  /** e.g. destination for go-to, resource for pick-up/drop-off, count for repeat, seconds for wait. */
  argument?: string | number;
  /** Nested blocks for `if` and `repeat` container blocks. */
  children?: RobotBlock[];
}

export interface RobotProgram {
  id: string;
  childId: string;
  cityId: string;
  robotName: string;
  blocks: RobotBlock[];
  createdAt: number;
}

export interface RobotRunStep {
  block: RobotBlock;
  outcome: string;
}

export interface RobotRunResult {
  programId: string;
  steps: RobotRunStep[];
  succeeded: boolean;
}

// ---------------------------------------------------------------------------
// Weekly Mission
// ---------------------------------------------------------------------------

export type WeeklyMissionDayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WeeklyMissionDay {
  day: WeeklyMissionDayNumber;
  title: string;
  completed: boolean;
  completedAt?: number;
}

export interface WeeklyMission {
  id: string;
  childId: string;
  theme: string;
  days: WeeklyMissionDay[];
  startedAt: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Family Council (incl. Sibling/Grandparent Mode)
// ---------------------------------------------------------------------------

/**
 * Family roles. Non-parent roles are limited to voting/cheering — never chat
 * or account administration — per the plan's "Sibling/Grandparent Mode"
 * addition (limited interaction only: vote, cheer, sticker).
 */
export type FamilyRole = 'parent' | 'sibling' | 'grandparent';

export interface FamilyCouncilProposal {
  id: string;
  cityId: string;
  question: string;
  options: string[];
  votes: { role: FamilyRole; option: string }[];
  qrCode: string;
  createdAt: number;
  decidedOption?: string;
  decidedAt?: number;
}

// ---------------------------------------------------------------------------
// Parent Safety: verifiable consent, moderation, data retention, region
// ---------------------------------------------------------------------------

export type ConsentMethod = 'card-verification' | 'verified-email' | 'symbolic-payment';
export type ConsentStatus = 'pending' | 'granted' | 'declined';

export interface ParentalConsent {
  id: string;
  childId: string;
  parentContactId: string;
  method: ConsentMethod;
  status: ConsentStatus;
  requestedAt: number;
  decidedAt?: number;
}

export type ModerationDecision = 'approved' | 'rejected';

export interface ModerationReview {
  id: string;
  artifactId: string;
  decision?: ModerationDecision;
  notes?: string;
  enqueuedAt: number;
  reviewedAt?: number;
}

export type RegionCode = 'IR' | 'AE' | 'OTHER';

export interface RegionalComplianceProfile {
  region: RegionCode;
  /** Minimum age at which a child may hold their own (non-parent-controlled) social interaction identity. */
  minSocialAccountAge: number;
  /** Days of inactivity after which the child's data is scheduled for auto-delete. */
  dataAutoDeleteAfterInactiveDays: number;
}

export interface DataDeletionRecord {
  childId: string;
  requestedAt: number;
  reason: 'parent-request' | 'auto-inactive';
  executedAt?: number;
}

// ---------------------------------------------------------------------------
// Safe Internal Expo (no chat, sticker-only reactions)
// ---------------------------------------------------------------------------

export type StickerReaction = 'city-grew' | 'great-robot' | 'beautiful-city' | 'smart-idea' | 'kind-heart';

export interface ExpoEntry {
  id: string;
  childId: string;
  artifactId: string;
  nickname: string;
  createdAt: number;
}

export interface StickerEvent {
  id: string;
  expoEntryId: string;
  fromChildId: string;
  reaction: StickerReaction;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Viral outputs: highlight video, micro-trailer, pride card, news, storybook
// ---------------------------------------------------------------------------

export type MediaArtifactType =
  | 'highlight-video'
  | 'micro-trailer'
  | 'parent-pride-card'
  | 'news-report'
  | 'storybook';

export interface MediaArtifact {
  id: string;
  childId: string;
  type: MediaArtifactType;
  mediaRef: string;
  caption: string;
  createdAt: number;
}

export interface InviteCode {
  code: string;
  inviterChildId: string;
  createdAt: number;
  redeemedByChildId?: string;
  redeemedAt?: number;
}

export interface FriendshipBadge {
  id: string;
  childAId: string;
  childBId: string;
  grantedAt: number;
}

// ---------------------------------------------------------------------------
// Growth Map
// ---------------------------------------------------------------------------

export type SkillCategory =
  | 'logical-thinking'
  | 'problem-solving'
  | 'decision-making'
  | 'collaboration'
  | 'resource-management'
  | 'creativity'
  | 'storytelling'
  | 'kindness'
  | 'responsibility';

export interface SkillEvent {
  id: string;
  childId: string;
  category: SkillCategory;
  occurredAt: number;
}

export interface GrowthReport {
  childId: string;
  periodStart: number;
  periodEnd: number;
  counts: Record<SkillCategory, number>;
}

// ---------------------------------------------------------------------------
// Retention engine: comeback moments, memory-based streaks
// ---------------------------------------------------------------------------

export interface MemoryEvent {
  id: string;
  childId: string;
  description: string;
  occurredAt: number;
}

export interface ComebackMessage {
  childId: string;
  message: string;
  triggeredAt: number;
}

// ---------------------------------------------------------------------------
// Special events: birthday/milestone, seasonal/cultural
// ---------------------------------------------------------------------------

export interface BirthdayEvent {
  id: string;
  childId: string;
  cityId: string;
  occurredAt: number;
  artifactId?: string;
}

export type SeasonalEventId = 'nowruz' | 'ramadan-eid' | 'yalda' | 'uae-national-day';

export interface SeasonalEventRule {
  id: SeasonalEventId;
  label: string;
  regions: RegionCode[];
  /** Month (1-12) and day the event begins each year. */
  startMonth: number;
  startDay: number;
  durationDays: number;
}
