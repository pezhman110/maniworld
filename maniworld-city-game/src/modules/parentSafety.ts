import {
  ConsentMethod,
  DataDeletionRecord,
  ModerationDecision,
  ModerationReview,
  ParentalConsent,
  RegionCode,
  RegionalComplianceProfile,
} from '../types/domain';

/**
 * Parent Safety module: verifiable parental consent (COPPA-style),
 * content moderation gating, data-retention/auto-delete policy, and a
 * regional compliance toggle (Iran/UAE differ on minimum social-account
 * age and are handled as swappable data, not hardcoded branches).
 */
export class ParentalConsentRegistry {
  private consents = new Map<string, ParentalConsent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `consent_${Date.now()}_${this.sequence}`;
  }

  /** Requests consent via one of the concrete, verifiable methods (never a bare checkbox). */
  request(childId: string, parentContactId: string, method: ConsentMethod, requestedAt: number = Date.now()): ParentalConsent {
    const consent: ParentalConsent = {
      id: this.nextId(),
      childId,
      parentContactId,
      method,
      status: 'pending',
      requestedAt,
    };
    this.consents.set(consent.id, consent);
    return consent;
  }

  grant(consentId: string, decidedAt: number = Date.now()): ParentalConsent {
    const consent = this.getById(consentId);
    consent.status = 'granted';
    consent.decidedAt = decidedAt;
    return consent;
  }

  decline(consentId: string, decidedAt: number = Date.now()): ParentalConsent {
    const consent = this.getById(consentId);
    consent.status = 'declined';
    consent.decidedAt = decidedAt;
    return consent;
  }

  getById(consentId: string): ParentalConsent {
    const consent = this.consents.get(consentId);
    if (!consent) {
      throw new Error(`Unknown parental consent id: ${consentId}`);
    }
    return consent;
  }

  hasGrantedConsent(childId: string): boolean {
    return [...this.consents.values()].some((consent) => consent.childId === childId && consent.status === 'granted');
  }
}

export class ModerationQueue {
  private reviews = new Map<string, ModerationReview>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `review_${Date.now()}_${this.sequence}`;
  }

  enqueue(artifactId: string, enqueuedAt: number = Date.now()): ModerationReview {
    const review: ModerationReview = { id: this.nextId(), artifactId, enqueuedAt };
    this.reviews.set(review.id, review);
    return review;
  }

  decide(reviewId: string, decision: ModerationDecision, notes?: string, reviewedAt: number = Date.now()): ModerationReview {
    const review = this.getById(reviewId);
    review.decision = decision;
    review.notes = notes;
    review.reviewedAt = reviewedAt;
    return review;
  }

  getById(reviewId: string): ModerationReview {
    const review = this.reviews.get(reviewId);
    if (!review) {
      throw new Error(`Unknown moderation review id: ${reviewId}`);
    }
    return review;
  }

  isApproved(artifactId: string): boolean {
    return [...this.reviews.values()].some((review) => review.artifactId === artifactId && review.decision === 'approved');
  }

  /** Reviews still awaiting a decision, oldest first — used to track the Content Moderation SLA. */
  pendingReviews(): ModerationReview[] {
    return [...this.reviews.values()]
      .filter((review) => !review.decision)
      .sort((a, b) => a.enqueuedAt - b.enqueuedAt);
  }

  /** Whether a pending review has exceeded the SLA window (default 1 hour), per the plan's Content Moderation SLA. */
  isOverSla(reviewId: string, slaMs: number = 60 * 60 * 1000, now: number = Date.now()): boolean {
    const review = this.getById(reviewId);
    return !review.decision && now - review.enqueuedAt > slaMs;
  }
}

/** Combined gate: something can only be shared if consent is granted AND moderation approved it. */
export function isClearedToShare(childId: string, artifactId: string, consents: ParentalConsentRegistry, moderation: ModerationQueue): boolean {
  return consents.hasGrantedConsent(childId) && moderation.isApproved(artifactId);
}

export const DEFAULT_REGIONAL_COMPLIANCE_PROFILES: RegionalComplianceProfile[] = [
  { region: 'IR', minSocialAccountAge: 13, dataAutoDeleteAfterInactiveDays: 365 },
  { region: 'AE', minSocialAccountAge: 15, dataAutoDeleteAfterInactiveDays: 365 },
  { region: 'OTHER', minSocialAccountAge: 13, dataAutoDeleteAfterInactiveDays: 365 },
];

export class RegionalComplianceRegistry {
  private profiles: Map<RegionCode, RegionalComplianceProfile>;

  constructor(profiles: RegionalComplianceProfile[] = DEFAULT_REGIONAL_COMPLIANCE_PROFILES) {
    this.profiles = new Map(profiles.map((profile) => [profile.region, profile]));
  }

  getProfile(region: RegionCode): RegionalComplianceProfile {
    const profile = this.profiles.get(region);
    if (!profile) {
      throw new Error(`No compliance profile configured for region: ${region}`);
    }
    return profile;
  }

  /** Whether a child of the given age may hold their own social-interaction identity in this region. */
  canHaveSocialAccount(region: RegionCode, age: number): boolean {
    return age >= this.getProfile(region).minSocialAccountAge;
  }
}

export class DataRetentionRegistry {
  private records: DataDeletionRecord[] = [];

  /** Schedules deletion — either explicitly requested by a parent, or triggered by prolonged inactivity. */
  scheduleDeletion(childId: string, reason: DataDeletionRecord['reason'], requestedAt: number = Date.now()): DataDeletionRecord {
    const record: DataDeletionRecord = { childId, reason, requestedAt };
    this.records.push(record);
    return record;
  }

  /** Auto-schedules deletion if the child has been inactive longer than the region's policy allows. */
  scheduleAutoDeleteIfInactive(
    childId: string,
    lastActiveAt: number,
    region: RegionCode,
    compliance: RegionalComplianceRegistry,
    now: number = Date.now()
  ): DataDeletionRecord | undefined {
    const inactiveDays = (now - lastActiveAt) / (24 * 60 * 60 * 1000);
    if (inactiveDays >= compliance.getProfile(region).dataAutoDeleteAfterInactiveDays) {
      return this.scheduleDeletion(childId, 'auto-inactive', now);
    }
    return undefined;
  }

  execute(childId: string, executedAt: number = Date.now()): DataDeletionRecord {
    const record = [...this.records].reverse().find((entry) => entry.childId === childId && !entry.executedAt);
    if (!record) {
      throw new Error(`No pending deletion record found for child: ${childId}`);
    }
    record.executedAt = executedAt;
    return record;
  }

  recordsForChild(childId: string): DataDeletionRecord[] {
    return this.records.filter((record) => record.childId === childId);
  }

  isDeleted(childId: string): boolean {
    return this.recordsForChild(childId).some((record) => record.executedAt !== undefined);
  }
}
