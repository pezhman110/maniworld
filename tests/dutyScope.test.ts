import { DutyScopeRegistry, startOfDay } from '../src/modules/dutyScope';
import { OutreachProspectRegistry } from '../src/modules/prospectOutreach';
import { Prospect } from '../src/types/domain';

function buildContractSentProspect(registry: OutreachProspectRegistry, id = 'prospect-1'): Prospect {
  registry.add({
    id,
    planId: 'plan-1',
    audienceProfileId: 'influencer',
    platform: 'instagram',
    accountHandle: '@jane',
    displayName: 'Jane Doe',
    matchScore: 90,
  });
  registry.qualify(id);
  registry.recordPlatformOutreach(id, 'Hi Jane!');
  registry.convertToContact(id, { email: 'jane@example.com' });
  registry.recordDirectOutreach(id, 'email', 'Following up.');
  registry.inviteOnlineSession(id, { scheduledAt: Date.now(), script: 'script' });
  registry.recordOnlineSessionOutcome(id, 'completed');
  registry.inviteInPerson(id, { locationId: 'salon-1', scheduledAt: new Date('2026-01-05T12:00:00').getTime() });
  registry.recordInPersonOutcome(id, 'completed');
  registry.submitForApproval(id, 'manager@example.com');
  registry.decideApproval(id, 'approved', 'boss@example.com');
  return registry.markContractSent(id);
}

describe('DutyScopeRegistry', () => {
  it('rejects defining a duty scope before the contract has been sent', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = prospects.add({
      id: 'prospect-1',
      planId: 'plan-1',
      platform: 'instagram',
      accountHandle: '@jane',
      matchScore: 90,
    });
    const dutyScopes = new DutyScopeRegistry();
    expect(() =>
      dutyScopes.define(prospect, { visitsPerPeriod: 2, period: 'day', servicesCovered: ['manicure'] })
    ).toThrow(/contract has been sent/);
  });

  it('defines a post-contract duty scope for e.g. an influencer visiting 2 salons/day', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = buildContractSentProspect(prospects);
    const dutyScopes = new DutyScopeRegistry();

    const scope = dutyScopes.define(prospect, {
      locationId: 'salon-1',
      visitsPerPeriod: 2,
      period: 'day',
      servicesCovered: ['manicure', 'hair'],
      commissionPercent: 10,
    });

    expect(scope.prospectId).toBe('prospect-1');
    expect(scope.active).toBe(true);
    expect(dutyScopes.expectedWeeklyVisits(scope)).toBe(14);
    expect(dutyScopes.listByProspect('prospect-1')).toHaveLength(1);
  });

  it('rejects invalid visitsPerPeriod/period/commissionPercent', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = buildContractSentProspect(prospects);
    const dutyScopes = new DutyScopeRegistry();

    expect(() =>
      dutyScopes.define(prospect, { visitsPerPeriod: 0, period: 'day', servicesCovered: [] })
    ).toThrow(/visitsPerPeriod/);
    expect(() =>
      dutyScopes.define(prospect, { visitsPerPeriod: 2, period: 'month' as never, servicesCovered: [] })
    ).toThrow(/period/);
    expect(() =>
      dutyScopes.define(prospect, { visitsPerPeriod: 2, period: 'day', servicesCovered: [], commissionPercent: 150 })
    ).toThrow(/commissionPercent/);
  });

  it('tracks check-ins and computes weekly compliance', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = buildContractSentProspect(prospects);
    const dutyScopes = new DutyScopeRegistry();
    const scope = dutyScopes.define(prospect, {
      visitsPerPeriod: 2,
      period: 'day',
      servicesCovered: ['manicure'],
    });

    const weekStart = startOfDay(new Date('2026-02-02T00:00:00').getTime()); // a Monday
    // Log 2 visits/day for the 7 days in the window (expected 14, actual 14 -> compliant),
    // then remove enough to create a deficit by only logging 10 of the 14 expected slots.
    const daySlots: number[] = [];
    for (let day = 0; day < 7; day += 1) {
      daySlots.push(weekStart + day * 24 * 60 * 60 * 1000, weekStart + day * 24 * 60 * 60 * 1000 + 1000);
    }
    // Log only the first 10 of the 14 expected daily visits -> deficit of 4.
    daySlots.slice(0, 10).forEach((ts) => dutyScopes.recordCheckIn(scope.id, ts, { locationId: 'salon-1' }));
    // Outside-the-window check-in should not count.
    dutyScopes.recordCheckIn(scope.id, weekStart - 1000);

    const compliance = dutyScopes.computeWeeklyCompliance(scope.id, weekStart);
    expect(compliance.expectedVisits).toBe(14);
    expect(compliance.actualVisits).toBe(10);
    expect(compliance.compliant).toBe(false);
    expect(compliance.deficit).toBe(4);
    expect(dutyScopes.listCheckIns(scope.id)).toHaveLength(11);
  });

  it('flags fully-compliant duty scopes as compliant with zero deficit', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = buildContractSentProspect(prospects);
    const dutyScopes = new DutyScopeRegistry();
    const scope = dutyScopes.define(prospect, {
      visitsPerPeriod: 1,
      period: 'week',
      servicesCovered: ['skin'],
    });

    const weekStart = startOfDay(Date.now());
    dutyScopes.recordCheckIn(scope.id, weekStart + 1000);

    const compliance = dutyScopes.computeWeeklyCompliance(scope.id, weekStart);
    expect(compliance.expectedVisits).toBe(1);
    expect(compliance.actualVisits).toBe(1);
    expect(compliance.compliant).toBe(true);
    expect(compliance.deficit).toBe(0);
  });

  it('lists only non-compliant duty scopes across the roster for the monitoring dashboard', () => {
    const prospects = new OutreachProspectRegistry();
    const prospectA = buildContractSentProspect(prospects, 'prospect-a');
    const prospectB = buildContractSentProspect(prospects, 'prospect-b');
    const dutyScopes = new DutyScopeRegistry();

    const scopeA = dutyScopes.define(prospectA, { visitsPerPeriod: 2, period: 'day', servicesCovered: [] });
    const scopeB = dutyScopes.define(prospectB, { visitsPerPeriod: 1, period: 'week', servicesCovered: [] });

    const weekStart = startOfDay(Date.now());
    // scopeA gets no check-ins (non-compliant); scopeB gets one (compliant).
    dutyScopes.recordCheckIn(scopeB.id, weekStart + 1000);

    const nonCompliant = dutyScopes.listNonCompliant(weekStart);
    expect(nonCompliant).toHaveLength(1);
    expect(nonCompliant[0].dutyScopeId).toBe(scopeA.id);

    const all = dutyScopes.listWeeklyCompliance(weekStart);
    expect(all).toHaveLength(2);
  });

  it('deactivates a duty scope and excludes it from active listings', () => {
    const prospects = new OutreachProspectRegistry();
    const prospect = buildContractSentProspect(prospects);
    const dutyScopes = new DutyScopeRegistry();
    const scope = dutyScopes.define(prospect, { visitsPerPeriod: 2, period: 'day', servicesCovered: [] });

    dutyScopes.deactivate(scope.id);
    expect(dutyScopes.get(scope.id)?.active).toBe(false);
    expect(dutyScopes.all(true)).toHaveLength(0);
    expect(dutyScopes.all(false)).toHaveLength(1);
  });

  it('throws for unknown duty scope ids', () => {
    const dutyScopes = new DutyScopeRegistry();
    expect(() => dutyScopes.recordCheckIn('missing')).toThrow(/not found/);
    expect(() => dutyScopes.computeWeeklyCompliance('missing', 0)).toThrow(/not found/);
    expect(() => dutyScopes.deactivate('missing')).toThrow(/not found/);
  });
});
