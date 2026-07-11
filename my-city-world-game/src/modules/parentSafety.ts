import {
  ClassroomComposition,
  ConsentMethod,
  ModerationDecision,
  ModerationReview,
  ParentalConsent,
  SafetyRejection,
} from '../types/domain';

/**
 * Parent Safety (plan block 8): COPPA/PDPL-style hard-coded guardrails for
 * "My Living City". Extends the same ParentalConsentRegistry / ModerationQueue
 * pattern used by `maniworld-city-game/src/modules/parentSafety.ts`, plus
 * the guardrails specific to this module's red lines:
 *  - no real child face photos
 *  - no last names / addresses / precise real-world identifiers
 *  - no "who's online" exposure between children
 *  - raw uploaded photos are never persisted
 *  - classroom-style composition is built only from aggregate counts
 */
export class ParentalConsentRegistry {
  private consents = new Map<string, ParentalConsent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `mycity_consent_${Date.now()}_${this.sequence}`;
  }

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
    return `mycity_review_${Date.now()}_${this.sequence}`;
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
}

/** Something is only shareable once consent is granted AND moderation approved it. */
export function isClearedToShare(childId: string, artifactId: string, consents: ParentalConsentRegistry, moderation: ModerationQueue): boolean {
  return consents.hasGrantedConsent(childId) && moderation.isApproved(artifactId);
}

/** Hard rejection: real child face photos are never accepted as sticker/avatar source material. */
export function rejectRealChildFacePhoto(isRealPhotoOfAChild: boolean): SafetyRejection | undefined {
  if (isRealPhotoOfAChild) {
    return { reason: 'real-child-face-photo', detail: 'Real photos of children cannot be used; only cartoon-generated avatars are allowed.' };
  }
  return undefined;
}

/** Hard rule: raw uploaded image bytes/URLs must never be persisted — only a count and a generated cartoon reference. */
export function assertNeverPersistRawImage(rawImagePersisted: boolean): void {
  if (rawImagePersisted) {
    throw new Error('Safety violation: raw uploaded image bytes must never be persisted.');
  }
}

/** Hard rule: no per-child "who is online now" exposure between children. */
export function assertNoOnlineStatusExposure(exposesOnlineStatusBetweenChildren: boolean): void {
  if (exposesOnlineStatusBetweenChildren) {
    throw new Error("Safety violation: a child's online status must never be exposed to other children.");
  }
}

/** Builds a classroom-style scene purely from aggregate counts — never names or faces. */
export function buildClassroomComposition(totalCount: number, girlCount: number, boyCount: number, averageAge: number): ClassroomComposition {
  if (girlCount + boyCount !== totalCount) {
    throw new Error('girlCount + boyCount must equal totalCount for an aggregate-only classroom composition.');
  }
  return { totalCount, girlCount, boyCount, averageAge };
}
