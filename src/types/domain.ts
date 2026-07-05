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

/** A minimum/maximum daily target for one market + metric combination. */
export interface MarketTargetRule {
  market: MarketType;
  metric: TargetMetric;
  minPerDay: number;
  maxPerDay: number;
}

/** Real-time/hourly pacing snapshot for one market + metric against its target. */
export interface MarketPacingReport {
  market: MarketType;
  metric: TargetMetric;
  minPerDay: number;
  maxPerDay: number;
  achievedSoFar: number;
  hoursElapsed: number;
  hoursRemaining: number;
  expectedByNowMin: number;
  onTrackForMin: boolean;
  remainingNeededForMin: number;
  requiredPerRemainingHour: number;
  isBelowTarget: boolean;
  isAboveMax: boolean;
}
