import {
  assertNeverPersistRawImage,
  assertNoOnlineStatusExposure,
  buildClassroomComposition,
  isClearedToShare,
  ModerationQueue,
  ParentalConsentRegistry,
  rejectRealChildFacePhoto,
} from '../src/modules/parentSafety';

describe('parentSafety', () => {
  it('rejects real child face photos', () => {
    expect(rejectRealChildFacePhoto(true)).toBeDefined();
    expect(rejectRealChildFacePhoto(false)).toBeUndefined();
  });

  it('throws if raw uploaded image persistence is attempted', () => {
    expect(() => assertNeverPersistRawImage(true)).toThrow();
    expect(() => assertNeverPersistRawImage(false)).not.toThrow();
  });

  it('throws if online-status exposure between children is attempted', () => {
    expect(() => assertNoOnlineStatusExposure(true)).toThrow();
    expect(() => assertNoOnlineStatusExposure(false)).not.toThrow();
  });

  it('builds an aggregate-only classroom composition', () => {
    const composition = buildClassroomComposition(10, 4, 6, 7.5);
    expect(composition.totalCount).toBe(10);
  });

  it('rejects a classroom composition whose counts do not add up', () => {
    expect(() => buildClassroomComposition(10, 4, 5, 7.5)).toThrow();
  });

  it('gates sharing on consent AND moderation approval', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('child_1', 'parent_1', 'in-app-parent-pin');
    const review = moderation.enqueue('artifact_1');
    expect(isClearedToShare('child_1', 'artifact_1', consents, moderation)).toBe(false);

    consents.grant(consent.id);
    expect(isClearedToShare('child_1', 'artifact_1', consents, moderation)).toBe(false);

    moderation.decide(review.id, 'approved');
    expect(isClearedToShare('child_1', 'artifact_1', consents, moderation)).toBe(true);
  });
});
