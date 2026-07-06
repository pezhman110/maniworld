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

// ---------------------------------------------------------------------------
// Freelancer recruitment & placement module
// ---------------------------------------------------------------------------

/**
 * A sales-manager-authored recruitment scheme for sourcing freelancers into
 * one market/service line. It carries the commission split the freelancer
 * will be contracted on: a direct percentage on their own clients' revenue,
 * and a percentage on any *other* salon service their client buys while
 * visiting for the freelancer's own line.
 */
export interface RecruitmentPlan {
  id: string;
  market: MarketType;
  line: string;
  createdBy: string;
  /** % of revenue from the freelancer's own clients that goes to the salon. */
  directCommissionPercent: number;
  /** % of revenue the salon keeps when the freelancer's client buys another salon service. */
  otherServicesCommissionPercent: number;
  /** Salons this plan is allowed to place freelancers into. */
  targetLocationIds: string[];
  active: boolean;
  notes?: string;
  createdAt: number;
}

export type JobBoard = 'indeed' | 'linkedin';

/** A job ad posted to an external job board for a recruitment plan. */
export interface FreelancerJobPosting {
  id: string;
  board: JobBoard;
  planId: string;
  title: string;
  url?: string;
  postedAt: number;
  active: boolean;
}

export type FreelancerSourceChannel = 'indeed' | 'linkedin' | 'manual-list' | 'referral' | 'inbound';

export type FreelancerStatus =
  | 'sourced'
  | 'applied'
  | 'screening'
  | 'interview-scheduled'
  | 'interviewed'
  | 'passed'
  | 'failed'
  | 'contract-offered'
  | 'hired'
  | 'rejected'
  | 'active-account';

/** One weekly recurring free-time window a freelancer says they can work (0 Sunday .. 6 Saturday). */
export interface FreelancerAvailabilitySlot {
  weekday: number;
  startHour: number;
  endHour: number;
}

/** A freelancer candidate/hire, tracked from sourcing through to an active salon account. */
export interface Freelancer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  /** Service line specialty, e.g. "nails", "hair" (matches ServiceLine.name). */
  line: string;
  source: FreelancerSourceChannel;
  resumeUrl?: string;
  resumeSummary?: string;
  /** Existing client count the freelancer says they can bring, used for capacity planning. */
  clientCount?: number;
  availability: FreelancerAvailabilitySlot[];
  status: FreelancerStatus;
  createdAt: number;
  notes?: string;
}

/** Per-salon-per-line service capacity, so the system can compute daily client throughput. */
export interface SalonLineCapacity {
  locationId: string;
  line: string;
  /** Minutes required to serve one client on this line (e.g. 120 for a nail "call"/appointment). */
  minutesPerClient: number;
  /** How many freelancers/chairs can run this line in parallel at this salon. */
  parallelSlots: number;
}

/** One allocated day for a freelancer at a specific salon, computed from availability + capacity. */
export interface FreelancerScheduleAllocation {
  locationId: string;
  weekday: number;
  startHour: number;
  endHour: number;
  clientsServed: number;
}

/** A weekly placement plan covering a freelancer's full client load across one or more salons. */
export interface FreelancerCapacityPlan {
  freelancerId: string;
  clientCount: number;
  allocations: FreelancerScheduleAllocation[];
  /** True when the allocations' total weekly client capacity covers `clientCount`. */
  fullyCovered: boolean;
  /** Remaining clients per week that could not be scheduled with current availability/capacity. */
  uncoveredClientCount: number;
}

export type InterviewOutcome = 'pending' | 'passed' | 'failed';

/** An in-salon (or online) interview outcome, recorded from the salon's own dashboard. */
export interface FreelancerInterviewRecord {
  freelancerId: string;
  locationId: string;
  scheduledAt: number;
  outcome: InterviewOutcome;
  recordedBy?: string;
  notes?: string;
}

export type HireDecision = 'hired' | 'rejected';

/** Final hire/reject decision, handed off to HR once recorded. */
export interface HireDecisionRecord {
  freelancerId: string;
  decision: HireDecision;
  decidedBy: string;
  decidedAt: number;
  offerLetterText?: string;
}

/** A signed commission contract for a hired freelancer, derived from a RecruitmentPlan. */
export interface FreelancerContract {
  id: string;
  freelancerId: string;
  planId: string;
  directCommissionPercent: number;
  otherServicesCommissionPercent: number;
  signedAt: number;
  active: boolean;
}

/** A notification to be sent as part of the hire/onboarding handoff (HR, manager, freelancer, salon). */
export interface HireNotification {
  recipientRole: 'hr' | 'sales-manager' | 'freelancer' | 'salon';
  recipientContact: string;
  subject: string;
  body: string;
}

/** The freelancer's converted, active resource account once hired and onboarded. */
export interface StaffAccount {
  id: string;
  freelancerId: string;
  fullName: string;
  line: string;
  market: MarketType;
  contractId: string;
  createdAt: number;
  active: boolean;
}

/**
 * Presentation & online-consultation campaign types.
 *
 * Covers the fully-independent "presentation session with online
 * consultation" module: an admin-editable audience/target-text profile
 * (e.g. influencer / company / group / bank), the goals that change
 * with the audience, the commission/collaboration model tied to a
 * vertical or profile, how a collaborator's resume/CV was sourced
 * (Indeed, LinkedIn, or a manually supplied link), and a single-page
 * landing site the admin can point at a custom domain with freely
 * editable content blocks (words/sentences/addresses).
 */

/** A manager-editable audience/target segment: who the presentation is aimed at and why. */
export interface AudienceProfile {
  id: string;
  /** Human label, e.g. "Influencers", "Banking sector", "Corporate group". */
  label: string;
  /** The text shown to this audience (changes per audience: "influencer" vs "company" vs "group" vs "bank"...). */
  targetText: string;
  /** Goals for this audience; changes together with the audience (e.g. banking → compliance-first goals). */
  goals: string[];
  vertical?: string;
  createdAt: number;
  active: boolean;
}

export type CommissionModelType = 'percentage' | 'flat' | 'tiered';

export interface CommissionTier {
  upToCount?: number;
  rate: number;
}

/** A commission/collaboration model, optionally scoped to one audience profile or vertical (e.g. banking changes the whole plan). */
export interface CommissionModel {
  id: string;
  label: string;
  type: CommissionModelType;
  /** Percentage (0-100) or flat amount, depending on `type`. Ignored when `type` is 'tiered'. */
  rate?: number;
  tiers?: CommissionTier[];
  audienceProfileId?: string;
  notes?: string;
  createdAt: number;
  active: boolean;
}

export type ResumeSource = 'indeed' | 'linkedin' | 'manual-link' | 'upload';

/** Where a collaborator/candidate's resume/CV came from, manually recorded or linked. */
export interface ResumeIntake {
  id: string;
  candidateName: string;
  source: ResumeSource;
  url?: string;
  audienceProfileId?: string;
  notes?: string;
  createdAt: number;
}

/** A manually-added, free-form content block for a landing page (word, sentence, or address). */
export interface LandingPageContentBlock {
  label: string;
  content: string;
}

/** A single-page site the admin can request at a chosen path/domain, tied to an audience profile. */
export interface LandingPageSite {
  id: string;
  slug: string;
  /** Optional custom domain this page should be served on once hosted, e.g. "consult.example.com". */
  domain?: string;
  audienceProfileId?: string;
  heroText: string;
  contentBlocks: LandingPageContentBlock[];
  /** Field names the page's lead-capture form should collect, e.g. ["fullName", "phone", "company"]. */
  leadFormFields: string[];
  createdAt: number;
  active: boolean;
}

/**
 * Prospect outreach pipeline types.
 *
 * Covers the "search for accounts matching our plan on a social/professional
 * network (influencer / freelancer / banking), score the match, and once it
 * crosses 80% work the account all the way to a signed contract" flow:
 * source -> qualify (>=80%) -> contact in the account's own environment ->
 * convert the account to an email/phone -> direct contact -> invite to an
 * online consultation (with a script) -> invite to the salon/office (with
 * a controlled time slot) -> hand the approved list to the responsible
 * person -> approve/reject -> send the contract.
 */

export type OutreachPlatform = 'instagram' | 'linkedin' | 'telegram' | 'x' | 'website' | 'bank-portal' | 'other';

export type ProspectStatus =
  | 'sourced'
  | 'qualified'
  | 'disqualified'
  | 'platform-contacted'
  | 'contact-converted'
  | 'direct-contacted'
  | 'online-invited'
  | 'online-completed'
  | 'online-no-show'
  | 'in-person-invited'
  | 'in-person-completed'
  | 'in-person-no-show'
  | 'pending-approval'
  | 'approved'
  | 'rejected'
  | 'contract-sent';

/** The online-consultation invite: a scheduled time plus the combined (default + manually-added) script used on the call. */
export interface OnlineSessionInvite {
  scheduledAt: number;
  script: string;
  outcome?: 'completed' | 'no-show';
}

/** The in-person invite to the salon/office, with the controlled time slot the requirement calls for. */
export interface InPersonVisit {
  locationId: string;
  scheduledAt: number;
  durationMinutes: number;
  outcome?: 'completed' | 'no-show';
}

/** The hand-off to the responsible person who must approve a prospect before a contract is sent. */
export interface ApprovalRecord {
  responsibleContact: string;
  submittedAt: number;
  decision?: 'approved' | 'rejected';
  decidedBy?: string;
  decidedAt?: number;
}

/**
 * A candidate account found on a social/professional network (or banking
 * portal) while searching for matches against a recruitment plan
 * (`RecruitmentPlan.id`) and/or an audience profile.
 */
export interface Prospect {
  id: string;
  planId: string;
  audienceProfileId?: string;
  platform: OutreachPlatform;
  accountHandle: string;
  displayName?: string;
  /** How well this account matches the plan's criteria, 0-100; only >=80 is auto-qualified for outreach. */
  matchScore: number;
  status: ProspectStatus;
  email?: string;
  phone?: string;
  /** The message sent inside the account's own platform (e.g. an Instagram/LinkedIn DM), before contact details are known. */
  platformMessage?: string;
  directOutreachChannel?: 'email' | 'phone';
  directOutreachMessage?: string;
  onlineSession?: OnlineSessionInvite;
  inPersonVisit?: InPersonVisit;
  approval?: ApprovalRecord;
  notes?: string;
  createdAt: number;
}

/**
 * Post-contract duty-scope (شرح وظیفه) types.
 *
 * Once a contract is sent (`Prospect.status === 'contract-sent'`), any
 * network partner - influencer, bank, or otherwise - is given a concrete
 * job description tied to the services/compensation they receive, e.g.
 * "visit 2 salons per day". Actual visits/check-ins are then logged and
 * rolled up into a weekly compliance report so the responsible manager can
 * monitor whether the agreed cadence is being kept.
 */

export type DutyPeriod = 'day' | 'week';

/** The post-contract job description agreed for a given prospect/network partner. */
export interface DutyScope {
  id: string;
  prospectId: string;
  locationId?: string;
  /** How many visits/actions are expected per `period`, e.g. 2 per day. */
  visitsPerPeriod: number;
  period: DutyPeriod;
  /** Salon services this duty scope is compensated against, e.g. ["manicure", "hair"]. */
  servicesCovered: string[];
  /** Optional commission/compensation percentage tied to this duty scope. */
  commissionPercent?: number;
  notes?: string;
  definedAt: number;
  active: boolean;
}

/** A single recorded visit/check-in against a duty scope. */
export interface DutyCheckIn {
  id: string;
  dutyScopeId: string;
  checkedInAt: number;
  locationId?: string;
  notes?: string;
}

/** Weekly roll-up comparing the agreed cadence to what was actually logged. */
export interface WeeklyComplianceReport {
  dutyScopeId: string;
  prospectId: string;
  /** Start-of-week timestamp (Monday 00:00, in the caller's timezone) this report covers. */
  weekStart: number;
  expectedVisits: number;
  actualVisits: number;
  compliant: boolean;
  deficit: number;
}
