import { ParentalConsentRegistry, ModerationQueue, isClearedToPublish } from '../src/modules/parentSafety';

describe('parentSafety', () => {
  it('requires both granted consent and approved moderation before publishing', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();

    expect(isClearedToPublish('child_1', 'marketplace-listing', 'listing_1', consents, moderation)).toBe(false);

    const consent = consents.request('child_1', 'parent_1');
    consents.grant(consent.id);
    expect(isClearedToPublish('child_1', 'marketplace-listing', 'listing_1', consents, moderation)).toBe(false);

    const review = moderation.enqueue('marketplace-listing', 'listing_1');
    moderation.decide(review.id, 'approved');
    expect(isClearedToPublish('child_1', 'marketplace-listing', 'listing_1', consents, moderation)).toBe(true);
  });

  it('blocks publishing when the parent declines consent', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('child_1', 'parent_1');
    consents.decline(consent.id);

    const review = moderation.enqueue('custom-game', 'game_1');
    moderation.decide(review.id, 'approved');

    expect(isClearedToPublish('child_1', 'custom-game', 'game_1', consents, moderation)).toBe(false);
  });

  it('blocks publishing when moderation rejects the subject', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('child_1', 'parent_1');
    consents.grant(consent.id);

    const review = moderation.enqueue('physical-print-order', 'order_1');
    moderation.decide(review.id, 'rejected');

    expect(isClearedToPublish('child_1', 'physical-print-order', 'order_1', consents, moderation)).toBe(false);
  });

  it('scopes moderation approval to the specific subject kind + id', () => {
    const moderation = new ModerationQueue();
    const review = moderation.enqueue('marketplace-listing', 'listing_1');
    moderation.decide(review.id, 'approved');

    expect(moderation.isApproved('marketplace-listing', 'listing_1')).toBe(true);
    expect(moderation.isApproved('custom-game', 'listing_1')).toBe(false);
  });
});
