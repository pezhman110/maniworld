import { ParentalConsentRegistry, ModerationQueue, isClearedToShare } from '../src/modules/safetyModeration';

describe('ParentalConsentRegistry', () => {
  it('starts pending and can be granted or declined', () => {
    const consents = new ParentalConsentRegistry();
    const consent = consents.request('child_1', 'parent_1');
    expect(consent.status).toBe('pending');
    expect(consents.hasGrantedConsent('child_1')).toBe(false);

    consents.grant(consent.id);
    expect(consents.hasGrantedConsent('child_1')).toBe(true);
  });

  it('supports declining consent', () => {
    const consents = new ParentalConsentRegistry();
    const consent = consents.request('child_2', 'parent_2');
    consents.decline(consent.id);
    expect(consents.getById(consent.id).status).toBe('declined');
    expect(consents.hasGrantedConsent('child_2')).toBe(false);
  });
});

describe('ModerationQueue', () => {
  it('is not approved until decided', () => {
    const moderation = new ModerationQueue();
    const review = moderation.enqueue('recap_1');
    expect(moderation.isApproved('recap_1')).toBe(false);

    moderation.decide(review.id, 'approved');
    expect(moderation.isApproved('recap_1')).toBe(true);
  });

  it('remains unapproved when rejected', () => {
    const moderation = new ModerationQueue();
    const review = moderation.enqueue('recap_2');
    moderation.decide(review.id, 'rejected', 'inappropriate background noise');
    expect(moderation.isApproved('recap_2')).toBe(false);
  });
});

describe('isClearedToShare', () => {
  it('requires BOTH granted consent and approved moderation', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();

    expect(isClearedToShare('child_1', 'recap_1', consents, moderation)).toBe(false);

    const consent = consents.request('child_1', 'parent_1');
    consents.grant(consent.id);
    expect(isClearedToShare('child_1', 'recap_1', consents, moderation)).toBe(false);

    const review = moderation.enqueue('recap_1');
    moderation.decide(review.id, 'approved');
    expect(isClearedToShare('child_1', 'recap_1', consents, moderation)).toBe(true);
  });
});
