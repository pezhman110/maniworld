import {
  DataRetentionRegistry,
  isClearedToShare,
  ModerationQueue,
  ParentalConsentRegistry,
  RegionalComplianceRegistry,
} from '../src/modules/parentSafety';

describe('ParentalConsentRegistry', () => {
  it('requires an explicit verifiable method and starts pending', () => {
    const registry = new ParentalConsentRegistry();
    const consent = registry.request('c1', 'p1', 'verified-email');
    expect(consent.status).toBe('pending');
    expect(consent.method).toBe('verified-email');
  });

  it('grants consent and reflects it in hasGrantedConsent', () => {
    const registry = new ParentalConsentRegistry();
    const consent = registry.request('c1', 'p1', 'card-verification');
    registry.grant(consent.id);
    expect(registry.hasGrantedConsent('c1')).toBe(true);
  });

  it('does not report granted consent when declined', () => {
    const registry = new ParentalConsentRegistry();
    const consent = registry.request('c1', 'p1', 'card-verification');
    registry.decline(consent.id);
    expect(registry.hasGrantedConsent('c1')).toBe(false);
  });
});

describe('ModerationQueue', () => {
  it('tracks pending reviews and SLA breaches', () => {
    const moderation = new ModerationQueue();
    const review = moderation.enqueue('artifact1', 0);
    expect(moderation.pendingReviews()).toHaveLength(1);
    expect(moderation.isOverSla(review.id, 60 * 60 * 1000, 2 * 60 * 60 * 1000)).toBe(true);
    expect(moderation.isOverSla(review.id, 60 * 60 * 1000, 30 * 60 * 1000)).toBe(false);
  });

  it('marks an artifact approved only after a positive decision', () => {
    const moderation = new ModerationQueue();
    const review = moderation.enqueue('artifact1');
    expect(moderation.isApproved('artifact1')).toBe(false);
    moderation.decide(review.id, 'approved');
    expect(moderation.isApproved('artifact1')).toBe(true);
  });
});

describe('isClearedToShare', () => {
  it('requires both granted consent and approved moderation', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('c1', 'p1', 'verified-email');
    const review = moderation.enqueue('artifact1');

    expect(isClearedToShare('c1', 'artifact1', consents, moderation)).toBe(false);

    consents.grant(consent.id);
    expect(isClearedToShare('c1', 'artifact1', consents, moderation)).toBe(false);

    moderation.decide(review.id, 'approved');
    expect(isClearedToShare('c1', 'artifact1', consents, moderation)).toBe(true);
  });
});

describe('RegionalComplianceRegistry', () => {
  it('uses region-specific minimum social account ages (UAE 15, others 13)', () => {
    const registry = new RegionalComplianceRegistry();
    expect(registry.canHaveSocialAccount('AE', 14)).toBe(false);
    expect(registry.canHaveSocialAccount('AE', 15)).toBe(true);
    expect(registry.canHaveSocialAccount('IR', 13)).toBe(true);
  });
});

describe('DataRetentionRegistry', () => {
  it('schedules and executes an explicit parent-requested deletion', () => {
    const registry = new DataRetentionRegistry();
    registry.scheduleDeletion('c1', 'parent-request');
    expect(registry.isDeleted('c1')).toBe(false);
    registry.execute('c1');
    expect(registry.isDeleted('c1')).toBe(true);
  });

  it('auto-schedules deletion once inactivity exceeds the regional policy', () => {
    const registry = new DataRetentionRegistry();
    const compliance = new RegionalComplianceRegistry();
    const now = Date.now();
    const lastActiveAt = now - 400 * 24 * 60 * 60 * 1000;

    const record = registry.scheduleAutoDeleteIfInactive('c1', lastActiveAt, 'IR', compliance, now);
    expect(record).toBeDefined();
    expect(record?.reason).toBe('auto-inactive');
  });

  it('does not schedule deletion when the child is still active', () => {
    const registry = new DataRetentionRegistry();
    const compliance = new RegionalComplianceRegistry();
    const now = Date.now();
    const record = registry.scheduleAutoDeleteIfInactive('c1', now - 1000, 'IR', compliance, now);
    expect(record).toBeUndefined();
  });
});
