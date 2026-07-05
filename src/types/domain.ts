/**
 * Shared domain types for the Mani World lead-to-booking automation pipeline.
 *
 * This pipeline covers the full journey:
 *  1. Lead intake (standard form + UTM + consent + anti-spam)
 *  2. Phone validation & best-number ranking
 *  3. Lead scoring
 *  4. Channel/account mapping (per social platform)
 *  5. Message & call scripts (versioned, A/B tested)
 *  6. Sales funnel automation (stages, SLA, reminders, escalation)
 *  7. Booking (hall / online meeting) with conflict prevention
 *  8. Video/in-person session preparation (roles, scenario, checklist)
 *  9. Unified interaction log (online + offline)
 * 10. Reporting & KPIs
 * 11. Security & compliance (RBAC, data retention)
 */

export type Channel =
  | 'google'
  | 'x'
  | 'telegram'
  | 'whatsapp'
  | 'instagram'
  | 'linkedin'
  | 'facebook'
  | 'youtube'
  | 'meta-ads'
  | 'email'
  | 'forum'
  | 'phone'
  | 'in-person'
  | 'website';

export type ConsentStatus = 'granted' | 'declined' | 'pending';

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface RawLeadInput {
  fullName: string;
  phone: string;
  email?: string;
  channel: Channel;
  message?: string;
  utm?: UtmParams;
  consent: ConsentStatus;
  /** Honeypot field: must stay empty. Non-empty means a bot filled the form. */
  honeypot?: string;
  /** Timestamp (ms) when the form was rendered, used for time-trap anti-spam. */
  formRenderedAt?: number;
  /** Timestamp (ms) when the form was submitted. */
  submittedAt?: number;
}

export interface Lead {
  id: string;
  fullName: string;
  phone: string;
  normalizedPhone: string;
  email?: string;
  channel: Channel;
  message?: string;
  utm?: UtmParams;
  consent: ConsentStatus;
  createdAt: number;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  isDuplicate: boolean;
  isSpam: boolean;
}

export interface ScoreBreakdown {
  channelWeight: number;
  hasEmail: number;
  messageQuality: number;
  utmQuality: number;
  consentGranted: number;
  total: number;
}

export type AccountRole = 'owner' | 'responder' | 'moderator' | 'viewer';

export interface ChannelAccount {
  channel: Channel;
  accountHandle: string;
  owner: string;
  role: AccountRole;
  goal: string;
  kpi: string;
  accessLevel: 'admin' | 'editor' | 'read-only';
  active: boolean;
}

export type ScriptStage =
  | 'first-contact'
  | 'follow-up-1'
  | 'follow-up-2'
  | 'qualification'
  | 'booking-offer'
  | 'reminder'
  | 'no-show-recovery';

export interface MessageScript {
  id: string;
  stage: ScriptStage;
  channel: Channel;
  version: number;
  variantLabel: string;
  body: string;
  delayHoursFromPreviousStage: number;
  active: boolean;
}

export type FunnelStage =
  | 'new-lead'
  | 'contacted'
  | 'qualified'
  | 'meeting-scheduled'
  | 'meeting-completed'
  | 'booked'
  | 'lost';

export interface FunnelSlaRule {
  stage: FunnelStage;
  maxHoursInStage: number;
  escalateToRole: AccountRole;
}

export interface FunnelEvent {
  leadId: string;
  fromStage: FunnelStage | null;
  toStage: FunnelStage;
  timestamp: number;
  actor: string;
  note?: string;
}

export type BookingType = 'hall' | 'online-meeting' | 'phone-call' | 'presentation';

export interface BookingSlot {
  id: string;
  leadId: string;
  type: BookingType;
  startsAt: number;
  endsAt: number;
  resource: string;
  confirmed: boolean;
}

export type VideoSessionRole = 'primary-presenter' | 'backup-presenter' | 'quality-observer';

export interface VideoSessionAssignment {
  bookingId: string;
  personName: string;
  role: VideoSessionRole;
}

export type SessionScenarioStep = 'opening' | 'discovery' | 'offer' | 'next-step';

export interface SessionChecklistItem {
  phase: 'pre' | 'during' | 'post';
  label: string;
  done: boolean;
}

export interface VideoSessionPlan {
  bookingId: string;
  assignments: VideoSessionAssignment[];
  scenario: SessionScenarioStep[];
  checklist: SessionChecklistItem[];
  recordingConsentGiven: boolean;
}

export type InteractionType =
  | 'message'
  | 'call'
  | 'meeting'
  | 'in-person'
  | 'paper-form'
  | 'email';

export interface InteractionLogEntry {
  id: string;
  leadId: string;
  channel: Channel;
  type: InteractionType;
  direction: 'inbound' | 'outbound';
  timestamp: number;
  summary: string;
  actor: string;
}

export interface FunnelMetrics {
  totalLeads: number;
  responseRate: number;
  meetingRate: number;
  bookingRate: number;
  costPerLead?: number;
}

export type UserRole = 'admin' | 'sales' | 'agent' | 'viewer';

export interface AccessControlEntry {
  userId: string;
  role: UserRole;
  allowedActions: string[];
}

export interface DataRetentionPolicy {
  entity: 'lead' | 'interaction' | 'recording';
  retentionDays: number;
}

/**
 * Business lines ("markets") the sales org runs at once. Each one gets its
 * own input panel (lead intake) and output (reporting) as requested:
 *  - salon-women: women's beauty salon services (per-branch, multi-salon)
 *  - home-service: at-home beauty service bookings
 *  - business-buying: helping clients buy a ready-made business/kiosk
 *  - business-selling: helping clients sell a ready-made business/kiosk
 *  - investment: salon investment opportunities
 */
export type MarketType =
  | 'salon-women'
  | 'home-service'
  | 'business-buying'
  | 'business-selling'
  | 'investment';

/** Daily operating window, expressed as local hours (0-24, may equal 24 for midnight). */
export interface WorkingHours {
  startHour: number;
  endHour: number;
}

export type LocationKind = 'salon-branch' | 'office';

/**
 * A physical location tied to a market: a salon branch (there can be many,
 * e.g. "Salon 1", "Salon 2", ...) or the company office (currently a single
 * office with a sales team).
 */
export interface Location {
  id: string;
  kind: LocationKind;
  market: MarketType;
  name: string;
  address: string;
  workingHours: WorkingHours;
  /** Number of salespeople/staff assigned to this location (e.g. office = 30 sellers). */
  staffCount?: number;
  active: boolean;
}

/** Booking outcome types tracked toward the per-market daily targets. */
export type TargetMetric =
  | 'confirmed-booking'
  | 'online-session'
  | 'in-person-meeting'
  | 'online-contact';

/**
 * A minimum/maximum daily target for one market + metric combination.
 *
 * `maxPerDay` is optional: some targets (e.g. investment online-session,
 * "70+/day") have no ceiling. Leave it `undefined` rather than using
 * `Infinity` — every consumer of this rule must treat "no cap" as an
 * explicit, first-class case instead of doing arithmetic on `Infinity`.
 */
export interface MarketTargetRule {
  market: MarketType;
  metric: TargetMetric;
  minPerDay: number;
  maxPerDay?: number;
}

/** Overall pacing status against the floor (min) target. */
export type PacingStatus = 'below-target' | 'on-track' | 'above-max' | 'missed';

/** A single hour-of-day weight, e.g. `{ hour: 18, weight: 3 }` = 3x an average hour. */
export interface HourlyWeight {
  hour: number;
  weight: number;
}

/** A full-day hourly demand curve for a market, used instead of a linear/uniform pacing assumption. */
export type HourlyWeightCurve = HourlyWeight[];

/** Real-time/hourly pacing snapshot for one market + metric against its target. */
export interface MarketPacingReport {
  market: MarketType;
  metric: TargetMetric;
  minPerDay: number;
  /** Undefined when the target has no stretch ceiling (e.g. "70+/day"). */
  maxPerDay?: number;
  achievedSoFar: number;
  hoursElapsed: number;
  hoursRemaining: number;
  /** Expected-by-now count against the floor (min), using the hourly weight curve. */
  expectedByNowMin: number;
  /** Expected-by-now count against the stretch target (max). Undefined when there's no max. */
  expectedByNowMax?: number;
  onTrackForMin: boolean;
  /** On track for the stretch target. Undefined when there's no max. */
  onTrackForMax?: boolean;
  remainingNeededForMin: number;
  /** Remaining needed to reach the stretch target. Undefined when there's no max. */
  remainingNeededForMax?: number;
  requiredPerRemainingHour: number;
  isBelowTarget: boolean;
  isAboveMax: boolean;
  /**
   * Explicit status replacing `Infinity`: when the working window has closed
   * (`hoursRemaining === 0`) and the floor wasn't reached, status is
   * `'missed'` rather than a `requiredPerRemainingHour` of `Infinity`.
   */
  status: PacingStatus;
}

/** A single day's holiday/closure override for the working calendar. */
export interface Holiday {
  /** ISO date (YYYY-MM-DD), interpreted in the Asia/Dubai timezone. */
  date: string;
  label: string;
  /** Fully closed (e.g. public holiday). Mutually exclusive with `adjustedHours`. */
  closed?: boolean;
  /** Reduced/shifted hours for the day (e.g. Ramadan, Friday half-day). */
  adjustedHours?: WorkingHours;
}

/** One weekday's default working-hours override (0 = Sunday .. 6 = Saturday). */
export interface WeekdayOverride {
  weekday: number;
  workingHours?: WorkingHours;
  closed?: boolean;
}

/** A per-branch or per-sales-rep breakdown of a market/metric target. */
export interface BranchRepTarget {
  market: MarketType;
  metric: TargetMetric;
  locationId: string;
  repId?: string;
  minPerDay: number;
  maxPerDay?: number;
}

/** Rollup of achieved-vs-target for one branch or rep. */
export interface RollupEntry {
  locationId: string;
  locationName?: string;
  repId?: string;
  minPerDay: number;
  maxPerDay?: number;
  achievedSoFar: number;
  gapToMin: number;
  percentOfMin: number;
}

export type ComparisonPeriod = 'yesterday' | 'last-week' | 'same-day-last-month';

/** "2x yesterday" / "half of last week" style delta comparison. */
export interface DeltaComparison {
  period: ComparisonPeriod;
  previousValue: number;
  currentValue: number;
  /** currentValue / previousValue. `null` when previousValue is 0 (undefined ratio, not Infinity). */
  ratio: number | null;
  direction: 'up' | 'down' | 'flat';
  /** Human-readable label, e.g. "2.0x yesterday" or "0.5x (half of) last week". */
  label: string;
}

/** Given the current pace, where will this metric land by end of the working day? */
export interface RunRateProjection {
  currentRatePerHour: number;
  hoursRemaining: number;
  projectedAdditional: number;
  projectedEndOfDay: number;
  projectedPercentOfMin: number;
  /** Undefined when there's no max target. */
  projectedPercentOfMax?: number;
}

export type MultiplierStatus = 'on-track' | 'needs-boost' | 'missed' | 'no-remaining-time';

/** The speed-up factor needed for the rest of the day to still hit the floor target. */
export interface RequiredMultiplier {
  currentRatePerHour: number;
  requiredRatePerHour: number;
  /** requiredRatePerHour / currentRatePerHour. `null` when currentRatePerHour is 0. */
  multiplier: number | null;
  status: MultiplierStatus;
}

export type ThresholdAlertLevel = 'red' | 'blue' | 'none';

/** Threshold alert: red = badly behind pace, blue = well ahead (reallocate capacity). */
export interface ThresholdAlert {
  level: ThresholdAlertLevel;
  message: string;
}

/** One point in a 7-day (or N-day) trend sparkline. */
export interface TrendPoint {
  date: string;
  value: number;
}

/** Funnel conversion metrics for one step of the pipeline, per market. */
export interface FunnelStepMetrics {
  stage: FunnelStage;
  count: number;
  conversionFromPrevious: number | null;
  conversionFromStart: number;
}

/** How well a market's leads convert, broken down by acquisition channel. */
export interface ChannelBreakdownEntry {
  channel: Channel;
  totalLeads: number;
  respondedCount: number;
  meetingCount: number;
  bookingCount: number;
  responseRate: number;
  bookingRate: number;
}

export type Locale = 'en' | 'fa';

// ---------------------------------------------------------------------------
// Configurable targets, scheduling/assignment, service lines & integrations
// ---------------------------------------------------------------------------

export type TargetOverridePeriod = 'daily' | 'weekly';

/**
 * A manager-editable override for a market/branch/line target, so targets
 * are no longer hardcoded: it can replace the min/max for a whole market,
 * one branch, or one sales rep/line, for a single day or every week.
 */
export interface TargetOverride {
  id: string;
  market: MarketType;
  metric: TargetMetric;
  period: TargetOverridePeriod;
  /** Required when period === 'daily': ISO date (YYYY-MM-DD) the override applies to. */
  date?: string;
  /** Required when period === 'weekly': 0 (Sunday) .. 6 (Saturday) the override applies to. */
  weekday?: number;
  /** Restricts the override to one branch/location. Omit to apply market-wide. */
  locationId?: string;
  /** Restricts the override to one sales rep/line. Omit to apply to the whole branch/market. */
  repId?: string;
  minPerDay?: number;
  maxPerDay?: number;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

/** A bookable meeting slot at a physical location (e.g. office in-person meetings). */
export interface MeetingSlot {
  id: string;
  locationId: string;
  startsAt: number;
  endsAt: number;
  capacity: number;
  bookedCount: number;
}

/** Who in-person meetings at a given office/location get routed to by default. */
export interface InPersonAssigneeRule {
  locationId: string;
  assigneeName: string;
  assigneeContact: string;
  notes?: string;
}

/** Who receives the results/summary after an online session for a market is executed. */
export interface OnlineResultRecipientRule {
  market: MarketType;
  recipientName: string;
  recipientContact: string;
  notes?: string;
}

/** One bookable service line inside a branch (e.g. "Hair" / "Nails" at Salon 1), with its own hours. */
export interface ServiceLine {
  id: string;
  locationId: string;
  market: MarketType;
  name: string;
  workingHours: WorkingHours;
  active: boolean;
}

/** Website/pricing integration hookup for a market, so the dashboard can link out to live prices. */
export interface WebsiteIntegrationConfig {
  market: MarketType;
  websiteUrl: string;
  priceListUrl?: string;
  syncPricesAutomatically: boolean;
  notes?: string;
}

export type ChannelRegistryEntryType = 'website' | 'social' | 'ads-account' | 'other';

/**
 * A manually-added tracking target (site/social/ads account/etc.) so a
 * manager can tell the system what to watch besides whatever it discovers
 * automatically.
 */
export interface ChannelRegistryEntry {
  id: string;
  label: string;
  url: string;
  type: ChannelRegistryEntryType;
  addedBy: string;
  notes?: string;
  active: boolean;
  createdAt: number;
}
