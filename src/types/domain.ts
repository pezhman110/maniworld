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
