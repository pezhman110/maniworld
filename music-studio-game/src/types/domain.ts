/**
 * Domain types for the Kids Music Studio.
 *
 * This is a standalone product (kids' music-making app with viral growth
 * mechanics). It intentionally lives in its own top-level project
 * (`music-studio-game/`) with its own package.json/tsconfig/jest config, so
 * it never gets built, tested, or deployed together with the unrelated
 * maniworld CRM (`src/`) or the separate `social-skills-game/` product.
 *
 * Target audience: kids 6-9, in two flavors:
 *  - "home" mode: a single child (or a few friends) picks a song and builds it.
 *  - "school" mode: a teacher runs the same flow for a classroom/group.
 *
 * NOTE ON SCOPE: real audio/video capture, mixing and rendering require
 * external media services. This project models the registries, state
 * machines and data contracts around that pipeline (what song, whose part,
 * what recording state, what the final mix/recap look like) — it does not
 * itself record, mix, or render audio/video.
 */

// ---------------------------------------------------------------------------
// Song catalog
// ---------------------------------------------------------------------------

export type SongGenre = 'pop' | 'lullaby' | 'folk' | 'nursery-rhyme' | 'sing-along' | 'holiday';

/** Interest tags used to power "search a song you like" for solo kids. */
export type InterestTag =
  | 'animals'
  | 'friendship'
  | 'adventure'
  | 'family'
  | 'space'
  | 'superheroes'
  | 'seasons'
  | 'silly'
  | 'calm';

export interface SongCatalogEntry {
  id: string;
  title: string;
  genre: SongGenre;
  /** Interest tags a child (or search box) can match against. */
  interestTags: InterestTag[];
  /** Suggested minimum/maximum age; the catalog is curated for 6-9 but kept as data. */
  minAge: number;
  maxAge: number;
  durationSeconds: number;
  /** Number of distinct singable/playable parts the song can be split into (for group mode). */
  partCount: number;
  /** Short, friendly description shown to the child. */
  description: string;
}

// ---------------------------------------------------------------------------
// Session mode (solo vs group) + part assignment
// ---------------------------------------------------------------------------

export type SessionMode = 'solo' | 'group';

/** Who chose the song: the child themself (solo, interest-driven), or a coach/teacher/system. */
export type SongSelector = 'child' | 'coach-or-teacher' | 'system-suggested';

export interface Participant {
  id: string;
  displayName: string;
}

export interface PartAssignment {
  partIndex: number;
  /** Free-text label for the part, e.g. "Verse 1", "Chorus", "Beat". */
  label: string;
  participantId: string;
}

export interface MusicSession {
  id: string;
  songId: string;
  mode: SessionMode;
  selectedBy: SongSelector;
  hostParticipantId: string;
  participantIds: string[];
  partAssignments: PartAssignment[];
  createdAt: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// Creation tools (guided steps)
// ---------------------------------------------------------------------------

export type CreationToolKind = 'beat' | 'melody' | 'effect' | 'lyrics';

export interface CreationTool {
  id: string;
  kind: CreationToolKind;
  label: string;
  /** Short kid-facing instruction, e.g. "Tap the drum pads to build a beat!". */
  instruction: string;
}

export interface GuidedStep {
  stepIndex: number;
  toolId: string;
  /** Kid-facing guidance text for this step of building the song. */
  prompt: string;
}

export interface GuidedStepProgress {
  sessionId: string;
  participantId: string;
  stepIndex: number;
  completedAt: number;
}

// ---------------------------------------------------------------------------
// Voice recording
// ---------------------------------------------------------------------------

export type RecordingStatus = 'pending' | 'recorded' | 'approved' | 'rejected';

export interface VoiceRecording {
  id: string;
  sessionId: string;
  participantId: string;
  partIndex: number;
  status: RecordingStatus;
  /** Opaque reference to the recorded audio asset (external media storage). */
  audioAssetRef?: string;
  recordedAt?: number;
  approvedAt?: number;
}

// ---------------------------------------------------------------------------
// Mix + final output
// ---------------------------------------------------------------------------

export type MixStatus = 'not-ready' | 'ready-to-mix' | 'mixed';

export interface MixOutput {
  id: string;
  sessionId: string;
  status: MixStatus;
  /** Opaque reference to the final mixed audio asset (external mixing service). */
  finalAudioAssetRef?: string;
  mixedAt?: number;
  includedRecordingIds: string[];
}

// ---------------------------------------------------------------------------
// Video recap
// ---------------------------------------------------------------------------

export interface VideoRecap {
  id: string;
  sessionId: string;
  mixOutputId: string;
  participantIds: string[];
  /** Opaque reference to the rendered recap video asset (external video render service). */
  videoAssetRef?: string;
  generatedAt: number;
}

// ---------------------------------------------------------------------------
// Safety & parental consent (must happen before any external share)
// ---------------------------------------------------------------------------

export type ConsentStatus = 'pending' | 'granted' | 'declined';

export interface ParentalConsent {
  id: string;
  childOrParticipantId: string;
  parentContactId: string;
  status: ConsentStatus;
  requestedAt: number;
  decidedAt?: number;
}

export type ModerationDecision = 'approved' | 'rejected';

export interface ModerationReview {
  id: string;
  videoRecapId: string;
  decision?: ModerationDecision;
  reviewedAt?: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Viral sharing (kid-safe: dual-reward invites + collective group challenges)
// ---------------------------------------------------------------------------

export type InviteRewardKind = 'studio-item' | 'studio-effect-unlock';

export interface InviteReward {
  kind: InviteRewardKind;
  itemId: string;
  label: string;
}

export interface InviteCode {
  code: string;
  inviterParticipantId: string;
  createdAt: number;
  reward: InviteReward;
  redeemedByParticipantId?: string;
  redeemedAt?: number;
}

export interface GroupChallenge {
  id: string;
  title: string;
  createdByParentOrTeacherId: string;
  memberThreshold: number;
  memberParticipantIds: string[];
  createdAt: number;
  activatedAt?: number;
}

export interface ShareEvent {
  id: string;
  videoRecapId: string;
  sharedAt: number;
  /** In-app social feed destination this recap was auto-posted to. */
  destination: 'in-app-feed' | 'classroom-feed';
}

// ---------------------------------------------------------------------------
// Progress reporting (parent/teacher)
// ---------------------------------------------------------------------------

export interface ParticipantProgressReport {
  participantId: string;
  generatedAt: number;
  sessionsCompleted: number;
  songsCompleted: string[];
  lastSessionAt?: number;
}

export interface TeacherClassroomReport {
  classroomId: string;
  generatedAt: number;
  totalStudents: number;
  studentsWithCompletedSessions: number;
  activeGroupChallenges: number;
}

// ---------------------------------------------------------------------------
// Classroom / school mode
// ---------------------------------------------------------------------------

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  studentParticipantIds: string[];
  createdAt: number;
}

export interface ClassroomProject {
  id: string;
  classroomId: string;
  sessionId: string;
  assignedAt: number;
}
