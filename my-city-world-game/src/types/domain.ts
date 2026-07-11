/**
 * Domain types for "My Living City" (`/mycity`): a safe, never-ending,
 * living-city builder for kids aged 6-9, where the child pieces together
 * their *own* real world — home, street, family, friends, pets, everyday
 * routines — from typed/spoken/archived sentences that become professional
 * cartoon stickers.
 *
 * This is a standalone product kept in its own top-level project
 * (`my-city-world-game/`) with its own package.json/tsconfig/jest config,
 * so it is never built, tested, or deployed together with the unrelated
 * maniworld CRM in `src/`, the older weekly-mission game in
 * `maniworld-city-game/` (the `/city` module), or the other standalone
 * kids' games (`music-studio-game/`, `social-skills-game/`,
 * `superhero-builder-game/`). "My Living City" (`/mycity`) is a *separate*
 * module from the superhero-creation studio — building a city must never
 * be conflated with building a superhero character.
 *
 * Out of scope (external services/infra, not modeled here — same boundary
 * as every sibling project): real Gemini/Nano-Banana image generation,
 * real browser STT, real MediaRecorder/ffmpeg.wasm video encoding, real OS
 * push-notification delivery, and any real database/localStorage/cloud
 * wiring. Everything below is a registry/state-machine data contract that
 * a real frontend can be wired up against later.
 */

// ---------------------------------------------------------------------------
// i18n / locale conventions (rule set, applies to every user-facing string)
// ---------------------------------------------------------------------------

export type SupportedLocale = 'fa' | 'ar' | 'en';

/** Every user-facing string in this module must carry all three locales. */
export interface LocaleString {
  fa: string;
  ar: string;
  en: string;
}

export type TextDirection = 'rtl' | 'ltr';

/** fa/ar render right-to-left, en renders left-to-right. */
export function rtlFor(locale: SupportedLocale): TextDirection {
  return locale === 'en' ? 'ltr' : 'rtl';
}

/** Speech-to-text locale tags used by the voice input method, keyed to the app's current language. */
export type VoiceLocaleTag = 'fa-IR' | 'ar-SA' | 'en-US';

export const VOICE_LOCALE_BY_LANGUAGE: Record<SupportedLocale, VoiceLocaleTag> = {
  fa: 'fa-IR',
  ar: 'ar-SA',
  en: 'en-US',
};

// ---------------------------------------------------------------------------
// Design system / mascot conventions (rule set)
// ---------------------------------------------------------------------------

/** A reference into the app's shared design-token system — never a hardcoded color/spacing literal. */
export interface DesignTokenRef {
  /** e.g. 'color.brand.primary', 'space.md', 'radius.lg' */
  token: string;
}

/** The dedicated Mani mascot variant for this module: Mani's face + a "little architect" persona. */
export interface ManiMascotDescriptor {
  variant: 'little-architect';
  faceRef: string;
  outfitRef: string;
  /** Short catchphrase shown alongside coaching tips, per locale. */
  catchphrase: LocaleString;
}

export const MANI_LITTLE_ARCHITECT: ManiMascotDescriptor = {
  variant: 'little-architect',
  faceRef: 'mani-face-default',
  outfitRef: 'mani-outfit-architect-helmet-and-blueprint',
  catchphrase: {
    fa: 'بیا با هم شهرت رو بسازیم!',
    ar: 'هيا نبني مدينتك معاً!',
    en: "Let's build your city together!",
  },
};

// ---------------------------------------------------------------------------
// Back-navigation convention (applies to every "page" model)
// ---------------------------------------------------------------------------

/** Marker every page-level model must carry so a real router can always render a back action. */
export interface BackNavigable {
  pageId: string;
  parentPageId?: string;
  supportsBack: boolean;
}

// ---------------------------------------------------------------------------
// Child profile (data minimization: nickname only, never a full legal name)
// ---------------------------------------------------------------------------

export interface ChildProfile {
  id: string;
  nickname: string;
  age: number;
  parentContactId: string;
}

// ---------------------------------------------------------------------------
// 1) Input methods (typed / voice / archive-sticker — no preset buttons)
// ---------------------------------------------------------------------------

export type InputMethodKind = 'typed' | 'voice' | 'archive-sticker';

export interface TypedInput {
  kind: 'typed';
  text: string;
  /** Whether the child pressed Enter or the "Build" (بساز) button. */
  submittedVia: 'enter-key' | 'build-button';
}

export interface VoiceInput {
  kind: 'voice';
  transcript: string;
  locale: VoiceLocaleTag;
}

export interface ArchiveStickerInput {
  kind: 'archive-sticker';
  stickerId: string;
}

export type ChildInput = TypedInput | VoiceInput | ArchiveStickerInput;

// ---------------------------------------------------------------------------
// 2) Scene tree — unlimited nested location drill-down, no depth ceiling
// ---------------------------------------------------------------------------

export type SceneNodeKind = 'city' | 'zone' | 'building' | 'floor' | 'room' | 'item';

export const SCENE_GRID_SIZE = 8;

export interface GridPosition {
  row: number;
  col: number;
}

export interface SceneNode {
  id: string;
  kind: SceneNodeKind;
  /** Free-form label the child typed/spoke, e.g. "villa with a pool and a mall next door". */
  label: string;
  parentId?: string;
  childIds: string[];
  /** Only meaningful for 'item' nodes placed inside a 'room' node's 8x8 grid. */
  gridPosition?: GridPosition;
  /** Sticker used to render this node, once generated. */
  stickerId?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// 3) Sticker studio — Scene DSL parse target + generation lifecycle
// ---------------------------------------------------------------------------

/** The structured shape a child's sentence is parsed into before image generation is requested. */
export interface SceneDslFragment {
  zone?: string;
  building?: string;
  floor?: string;
  room?: string;
  item?: string;
}

export type StickerStatus = 'pending-generation' | 'generated' | 'needs-revision' | 'approved';

export interface StickerRequest {
  id: string;
  childId: string;
  sourceSentence: string;
  dsl: SceneDslFragment;
  status: StickerStatus;
  /** Reference to the generated cartoon image; population is external (Gemini/Nano-Banana). */
  imageRef?: string;
  revisionNotes?: string;
  createdAt: number;
  updatedAt: number;
}

/** The 6-icon fallback kit for a very young/impatient child who doesn't want to wait for generation. */
export type FallbackEmojiKit =
  | '🏠'
  | '🧑'
  | '🐶'
  | '🚗'
  | '🌳'
  | '⭐';

export const DEFAULT_FALLBACK_EMOJI_KIT: FallbackEmojiKit[] = ['🏠', '🧑', '🐶', '🚗', '🌳', '⭐'];

// ---------------------------------------------------------------------------
// 4) Residents — never a real last name, address, or precise identifier
// ---------------------------------------------------------------------------

export type ResidentKind = 'person' | 'animal' | 'role';

export type ResidentRole = 'driver' | 'neighbor' | 'grandmother' | 'grandfather' | 'teacher' | 'friend' | 'other';

export type ResidentMood = 'happy' | 'kind' | 'angry' | 'sad' | 'excited' | 'calm' | 'hard';

export interface Resident {
  id: string;
  cityId: string;
  kind: ResidentKind;
  /** Short nickname only — never a full name. Enforced by validation in residents.ts. */
  nickname: string;
  role?: ResidentRole;
  avatarRef: string;
  mood: ResidentMood;
  note?: string;
  locationNodeId?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// 5) Events — uploaded photos are counted only, never persisted
// ---------------------------------------------------------------------------

export type CityEventKind = 'birthday' | 'outing' | 'party' | 'visit';

export interface CityEvent {
  id: string;
  cityId: string;
  kind: CityEventKind;
  title: LocaleString;
  /** How many photos the child uploaded — the raw bytes are never stored anywhere. */
  uploadedPhotoCount: number;
  /** Reference to a generated cartoon scene standing in for the real photo(s). */
  cartoonSceneRef?: string;
  occurredAt: number;
}

// ---------------------------------------------------------------------------
// 6) Coach Mani — step-by-step motivational guidance
// ---------------------------------------------------------------------------

export type CoachTriggerAction =
  | 'built-zone'
  | 'built-building'
  | 'built-room'
  | 'placed-item'
  | 'added-resident'
  | 'added-event'
  | 'shared-city'
  | 'idle-return';

export interface CoachTip {
  id: string;
  trigger: CoachTriggerAction;
  message: LocaleString;
  mascot: ManiMascotDescriptor;
}

// ---------------------------------------------------------------------------
// 7) Parent view — non-analytic, PIN-gated summary
// ---------------------------------------------------------------------------

export interface ParentPinConfig {
  pin: string;
}

export interface ParentCitySummary {
  cityId: string;
  totalResidents: number;
  totalBuildings: number;
  totalEvents: number;
  hardMoodResidentRatio: number;
  /** Present only when hardMoodResidentRatio >= 0.5 — a soft nudge, never a diagnosis. */
  softNudge?: LocaleString;
}

// ---------------------------------------------------------------------------
// 8) Parent safety guardrails (extends the sibling parentSafety.ts pattern)
// ---------------------------------------------------------------------------

export type ConsentMethod = 'email-confirmation' | 'sms-code' | 'in-app-parent-pin' | 'signed-form-upload';

export interface ParentalConsent {
  id: string;
  childId: string;
  parentContactId: string;
  method: ConsentMethod;
  status: 'pending' | 'granted' | 'declined';
  requestedAt: number;
  decidedAt?: number;
}

export type ModerationDecision = 'approved' | 'rejected';

export interface ModerationReview {
  id: string;
  artifactId: string;
  enqueuedAt: number;
  decision?: ModerationDecision;
  notes?: string;
  reviewedAt?: number;
}

export type SafetyRejectionReason =
  | 'real-child-face-photo'
  | 'last-name-detected'
  | 'address-detected'
  | 'precise-real-identifier'
  | 'raw-image-persistence-attempt'
  | 'online-status-exposure-attempt';

export interface SafetyRejection {
  reason: SafetyRejectionReason;
  detail: string;
}

/** Aggregate-only classroom composition — never names or faces. */
export interface ClassroomComposition {
  totalCount: number;
  girlCount: number;
  boyCount: number;
  averageAge: number;
}

// ---------------------------------------------------------------------------
// 9) Share links (viral rule)
// ---------------------------------------------------------------------------

export interface ShareRecord {
  id: string;
  cityId: string;
  slugPath: string; // e.g. '/mycity/share/abc123'
  title: LocaleString;
  description: LocaleString;
  thumbRef: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Archive (named saves, search, import/export)
// ---------------------------------------------------------------------------

export type PersistenceTarget = 'local-storage' | 'cloud-sync';

export interface SavedSceneArchiveEntry {
  id: string;
  cityId: string;
  title: string;
  tags: string[];
  persistenceTarget: PersistenceTarget;
  sceneJson: string;
  savedAt: number;
}

// ---------------------------------------------------------------------------
// Media outputs (recorded formats as data; real capture/encoding is external)
// ---------------------------------------------------------------------------

export type MediaFormatId = 'story-9x16-15s' | 'short-9x16-60s' | 'long-16x9-180s';

export interface MediaFormatSpec {
  id: MediaFormatId;
  aspectRatio: '9:16' | '16:9';
  maxDurationSeconds: number;
  label: LocaleString;
}

export const MEDIA_FORMAT_SPECS: MediaFormatSpec[] = [
  {
    id: 'story-9x16-15s',
    aspectRatio: '9:16',
    maxDurationSeconds: 15,
    label: { fa: 'استوری', ar: 'قصة', en: 'Story' },
  },
  {
    id: 'short-9x16-60s',
    aspectRatio: '9:16',
    maxDurationSeconds: 60,
    label: { fa: 'کلیپ کوتاه', ar: 'مقطع قصير', en: 'Short' },
  },
  {
    id: 'long-16x9-180s',
    aspectRatio: '16:9',
    maxDurationSeconds: 180,
    label: { fa: 'ویدیوی بلند', ar: 'فيديو طويل', en: 'Long video' },
  },
];

export interface MediaArtifact {
  id: string;
  cityId: string;
  formatId: MediaFormatId;
  status: 'queued' | 'ready';
  /** Reference to the rendered file; real MediaRecorder/ffmpeg.wasm encoding is out of scope. */
  fileRef?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Cross-posting queue (official-API-first / manual-fallback — never scripted auto-posting)
// ---------------------------------------------------------------------------

export type CrossPostDestination = 'manigram' | 'public-city' | 'instagram' | 'tiktok' | 'youtube';

export type CrossPostStatus = 'queued-official-api' | 'queued-manual-fallback' | 'posted' | 'failed';

export interface CrossPostRequest {
  id: string;
  mediaArtifactId: string;
  destination: CrossPostDestination;
  status: CrossPostStatus;
  /** Always driven through the destination's official share sheet/API — never scripted automation. */
  usesOfficialShareApi: boolean;
  createdAt: number;
  updatedAt: number;
}

// ---------------------------------------------------------------------------
// Persistence contract (mycity_scenes)
// ---------------------------------------------------------------------------

export interface MyCitySceneRecord {
  id: string;
  user_id: string;
  title: LocaleString;
  scene: SceneNode[];
  thumb: string;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Extra: notifications ("your city is alive, come back")
// ---------------------------------------------------------------------------

export type NotificationKind = 'city-is-alive-nudge' | 'friend-visited' | 'daily-leaderboard-result' | 'new-mission';

export interface PushNotificationPayload {
  id: string;
  childId: string;
  kind: NotificationKind;
  title: LocaleString;
  body: LocaleString;
  scheduledFor: number;
  sentAt?: number;
}

// ---------------------------------------------------------------------------
// Extra: economy (wallet / allowance / shop)
// ---------------------------------------------------------------------------

export interface Wallet {
  cityId: string;
  balance: number;
}

export interface WalletTransaction {
  id: string;
  cityId: string;
  amount: number;
  kind: 'earn' | 'spend';
  reason: string;
  createdAt: number;
}

export interface ShopPurchase {
  id: string;
  cityId: string;
  itemLabel: string;
  cost: number;
  linkedResidentId?: string;
  linkedBuildingId?: string;
  purchasedAt: number;
}

// ---------------------------------------------------------------------------
// Extra: screen-time scheduling (game / TV windows)
// ---------------------------------------------------------------------------

export type ScreenTimeActivity = 'game' | 'tv';

/** Hours are 0-23, local time; a window may wrap past midnight only if explicitly split by the parent into two entries. */
export interface ScreenTimeWindow {
  activity: ScreenTimeActivity;
  startHour: number;
  endHour: number;
  maxMinutesPerDay?: number;
}

export interface ScreenTimeSchedule {
  childId: string;
  windows: ScreenTimeWindow[];
}

// ---------------------------------------------------------------------------
// Extra: daily leaderboard (non-competitive-shaming framing)
// ---------------------------------------------------------------------------

export interface CityScoreInputs {
  cityId: string;
  buildingCount: number;
  residentCount: number;
  averageResidentHappiness: number; // 0-100
}

export interface LeaderboardEntry {
  cityId: string;
  score: number;
  rank: number;
}

export interface DailyLeaderboardSnapshot {
  dateKey: string; // e.g. '2026-07-06'
  entries: LeaderboardEntry[];
}

// ---------------------------------------------------------------------------
// Extra: collapse/archive a city (never a hard delete, never "finished")
// ---------------------------------------------------------------------------

export type CityLifecycleState = 'active' | 'collapsed';

export interface CityLifecycleRecord {
  cityId: string;
  state: CityLifecycleState;
  collapsedAt?: number;
  reopenedAt?: number;
}
