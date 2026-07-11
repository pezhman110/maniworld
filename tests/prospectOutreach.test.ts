import {
  OutreachProspectRegistry,
  OutreachScriptRegistry,
  QUALIFY_THRESHOLD,
  generateProspectContractPacket,
  ProspectNotFoundError,
  InvalidProspectStatusError,
} from '../src/modules/prospectOutreach';

function addSourced(registry: OutreachProspectRegistry, matchScore: number, id = 'prospect-1') {
  return registry.add({
    id,
    planId: 'plan-1',
    audienceProfileId: 'influencer',
    platform: 'instagram',
    accountHandle: '@jane',
    displayName: 'Jane Doe',
    matchScore,
  });
}

describe('OutreachScriptRegistry', () => {
  it('combines a base script with manually-added custom segments', () => {
    const registry = new OutreachScriptRegistry();
    registry.setBaseScript('influencer', 'Hi {{firstName}}, our default pitch.');
    registry.addCustomSegment('influencer', 'Mention the new spring campaign.');
    const combined = registry.getCombinedScript('influencer');
    expect(combined).toContain('our default pitch');
    expect(combined).toContain('spring campaign');
  });

  it('falls back to a default script when no base script was set', () => {
    const registry = new OutreachScriptRegistry();
    expect(registry.getCombinedScript('unknown')).toContain('quick call');
  });
});

describe('OutreachProspectRegistry', () => {
  it('sources a prospect and rejects an out-of-range match score', () => {
    const registry = new OutreachProspectRegistry();
    expect(() => addSourced(registry, 150)).toThrow();
  });

  it('auto-qualifies a prospect scoring at or above the 80% threshold', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, QUALIFY_THRESHOLD);
    const qualified = registry.qualify('prospect-1');
    expect(qualified.status).toBe('qualified');
  });

  it('disqualifies a prospect scoring below the threshold', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 79);
    const disqualified = registry.qualify('prospect-1');
    expect(disqualified.status).toBe('disqualified');
  });

  it('runs a qualified prospect all the way through to a sent contract', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');

    registry.recordPlatformOutreach('prospect-1', 'Hi, loved your latest post!');
    let prospect = registry.convertToContact('prospect-1', { email: 'jane@example.com', phone: '+989120000000' });
    expect(prospect.status).toBe('contact-converted');

    prospect = registry.recordDirectOutreach('prospect-1', 'email', 'Following up from Instagram.');
    expect(prospect.status).toBe('direct-contacted');

    prospect = registry.inviteOnlineSession('prospect-1', {
      scheduledAt: new Date('2026-01-01T10:00:00').getTime(),
      script: 'Combined script text',
    });
    expect(prospect.status).toBe('online-invited');

    prospect = registry.recordOnlineSessionOutcome('prospect-1', 'completed');
    expect(prospect.status).toBe('online-completed');

    prospect = registry.inviteInPerson('prospect-1', {
      locationId: 'salon-1',
      scheduledAt: new Date('2026-01-02T14:00:00').getTime(),
    });
    expect(prospect.status).toBe('in-person-invited');

    prospect = registry.recordInPersonOutcome('prospect-1', 'completed');
    expect(prospect.status).toBe('in-person-completed');

    prospect = registry.submitForApproval('prospect-1', 'manager@example.com');
    expect(prospect.status).toBe('pending-approval');
    expect(registry.listPendingApproval()).toHaveLength(1);

    prospect = registry.decideApproval('prospect-1', 'approved', 'boss@example.com');
    expect(prospect.status).toBe('approved');
    expect(registry.listPendingApproval()).toHaveLength(0);

    prospect = registry.recordReferenceCheck('prospect-1', {
      contactedPreviousEmployer: true,
      confirmedBy: 'hr@example.com',
    });
    expect(prospect.referenceCheck?.contactedPreviousEmployer).toBe(true);

    prospect = registry.markContractSent('prospect-1');
    expect(prospect.status).toBe('contract-sent');

    const contractText = generateProspectContractPacket(prospect);
    expect(contractText).toContain('Jane Doe');
    expect(contractText).toContain('90%');
  });

  it('rejects converting an account before it has been contacted on-platform', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');
    expect(() => registry.convertToContact('prospect-1', { email: 'jane@example.com' })).toThrow(
      InvalidProspectStatusError
    );
  });

  it('requires at least one contact method to convert an account', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');
    registry.recordPlatformOutreach('prospect-1', 'Hi there!');
    expect(() => registry.convertToContact('prospect-1', {})).toThrow();
  });

  it('rejects direct outreach by a channel with no contact info on file', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');
    registry.recordPlatformOutreach('prospect-1', 'Hi there!');
    registry.convertToContact('prospect-1', { phone: '+989120000000' });
    expect(() => registry.recordDirectOutreach('prospect-1', 'email', 'Following up.')).toThrow();
  });

  it('keeps in-person invites within the controlled visiting-hours window', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');
    registry.recordPlatformOutreach('prospect-1', 'Hi there!');
    registry.convertToContact('prospect-1', { email: 'jane@example.com' });
    registry.recordDirectOutreach('prospect-1', 'email', 'Following up.');
    registry.inviteOnlineSession('prospect-1', {
      scheduledAt: new Date('2026-01-01T10:00:00').getTime(),
      script: 'Script',
    });
    registry.recordOnlineSessionOutcome('prospect-1', 'completed');

    expect(() =>
      registry.inviteInPerson('prospect-1', {
        locationId: 'salon-1',
        scheduledAt: new Date('2026-01-02T23:00:00').getTime(),
      })
    ).toThrow(/visiting window/);
  });

  it('allows re-inviting to an online session after a no-show', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90);
    registry.qualify('prospect-1');
    registry.recordPlatformOutreach('prospect-1', 'Hi there!');
    registry.convertToContact('prospect-1', { email: 'jane@example.com' });
    registry.recordDirectOutreach('prospect-1', 'email', 'Following up.');
    registry.inviteOnlineSession('prospect-1', {
      scheduledAt: new Date('2026-01-01T10:00:00').getTime(),
      script: 'Script',
    });
    registry.recordOnlineSessionOutcome('prospect-1', 'no-show');

    const reinvited = registry.inviteOnlineSession('prospect-1', {
      scheduledAt: new Date('2026-01-03T10:00:00').getTime(),
      script: 'Script v2',
    });
    expect(reinvited.status).toBe('online-invited');
  });

  it('throws for an unknown prospect id', () => {
    const registry = new OutreachProspectRegistry();
    expect(() => registry.qualify('missing')).toThrow(ProspectNotFoundError);
  });

  it('lists prospects by plan and by status', () => {
    const registry = new OutreachProspectRegistry();
    addSourced(registry, 90, 'prospect-1');
    addSourced(registry, 40, 'prospect-2');
    registry.qualify('prospect-1');
    registry.qualify('prospect-2');

    expect(registry.listByPlan('plan-1')).toHaveLength(2);
    expect(registry.listByStatus('qualified')).toHaveLength(1);
    expect(registry.listByStatus('disqualified')).toHaveLength(1);
  });
});
