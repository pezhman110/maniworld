import { ModerationDecision, ModerationReview, ModerationSubjectKind, ParentalConsent } from '../types/domain';

/**
 * Parental safety module.
 *
 * Mirrors the ParentalConsentRegistry + ModerationQueue pattern used by the
 * other kids' products in this repository (`music-studio-game`,
 * `maniworld-city-game`). Any action that exposes a child's creation beyond
 * their own device — listing a character/custom game in the marketplace, or
 * placing a physical print/shipping order — requires BOTH explicit parental
 * consent AND a passed moderation review; there is no way to skip this
 * gate, keeping the feature compliant with platform/child-safety rules.
 */
export class ParentalConsentRegistry {
  private consents = new Map<string, ParentalConsent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `consent_${Date.now()}_${this.sequence}`;
  }

  request(childOrCreatorId: string, parentContactId: string, requestedAt: number = Date.now()): ParentalConsent {
    const consent: ParentalConsent = {
      id: this.nextId(),
      childOrCreatorId,
      parentContactId,
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

  hasGrantedConsent(childOrCreatorId: string): boolean {
    return [...this.consents.values()].some(
      (consent) => consent.childOrCreatorId === childOrCreatorId && consent.status === 'granted'
    );
  }
}

export class ModerationQueue {
  private reviews = new Map<string, ModerationReview>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `review_${Date.now()}_${this.sequence}`;
  }

  enqueue(subjectKind: ModerationSubjectKind, subjectId: string): ModerationReview {
    const review: ModerationReview = { id: this.nextId(), subjectKind, subjectId };
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

  isApproved(subjectKind: ModerationSubjectKind, subjectId: string): boolean {
    return [...this.reviews.values()].some(
      (review) => review.subjectKind === subjectKind && review.subjectId === subjectId && review.decision === 'approved'
    );
  }
}

/**
 * Combined gate used before any marketplace listing or physical print order:
 * requires granted parental consent for the creator/child AND a passed
 * moderation review for the specific subject (listing/custom-game/print-order).
 */
export function isClearedToPublish(
  childOrCreatorId: string,
  subjectKind: ModerationSubjectKind,
  subjectId: string,
  consents: ParentalConsentRegistry,
  moderation: ModerationQueue
): boolean {
  return consents.hasGrantedConsent(childOrCreatorId) && moderation.isApproved(subjectKind, subjectId);
}
