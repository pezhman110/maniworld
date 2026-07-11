import { ModerationDecision, ModerationReview, ParentalConsent } from '../types/domain';

/**
 * Safety & moderation module.
 *
 * Baked-in safety gate: a recap video generated from a session (which
 * contains kids' recorded voices/appearance) must have BOTH (a) explicit
 * parental consent and (b) a passed content-moderation review before the
 * `viralShare` module is allowed to post it anywhere — mirroring the same
 * "explicit parental consent + moderation before sharing" principle used in
 * the `social-skills-game` project's safety guidance.
 */
export class ParentalConsentRegistry {
  private consents = new Map<string, ParentalConsent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `consent_${Date.now()}_${this.sequence}`;
  }

  request(childOrParticipantId: string, parentContactId: string, requestedAt: number = Date.now()): ParentalConsent {
    const consent: ParentalConsent = {
      id: this.nextId(),
      childOrParticipantId,
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

  hasGrantedConsent(childOrParticipantId: string): boolean {
    return [...this.consents.values()].some(
      (consent) => consent.childOrParticipantId === childOrParticipantId && consent.status === 'granted'
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

  enqueue(videoRecapId: string): ModerationReview {
    const review: ModerationReview = { id: this.nextId(), videoRecapId };
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

  isApproved(videoRecapId: string): boolean {
    return [...this.reviews.values()].some(
      (review) => review.videoRecapId === videoRecapId && review.decision === 'approved'
    );
  }
}

/**
 * Combined gate used by the viral-share flow: a recap can only be shared
 * once its owning participant has granted parental consent AND the recap
 * has passed moderation.
 */
export function isClearedToShare(
  participantId: string,
  videoRecapId: string,
  consents: ParentalConsentRegistry,
  moderation: ModerationQueue
): boolean {
  return consents.hasGrantedConsent(participantId) && moderation.isApproved(videoRecapId);
}
