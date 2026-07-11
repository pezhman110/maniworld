import {
  CompliancePolicyNotFoundError,
  CompliancePolicyRegistry,
  deriveRouteFromIntakeSource,
} from '../src/modules/compliancePolicy';
import { CompliancePolicyRule } from '../src/types/domain';

const baseRules: CompliancePolicyRule[] = [
  { id: 'must-real-account', kind: 'must', text: 'Use the candidate/company\'s own real, existing account.' },
  { id: 'must-not-fake-account', kind: 'must-not', text: 'Never create or purchase fake/synthetic social accounts.' },
];

describe('deriveRouteFromIntakeSource', () => {
  it('maps each intake source to exactly one acquisition route', () => {
    expect(deriveRouteFromIntakeSource('network-search')).toBe('direct-network');
    expect(deriveRouteFromIntakeSource('job-application')).toBe('job-posting');
    expect(deriveRouteFromIntakeSource('resume-submission')).toBe('resume-intake');
  });
});

describe('CompliancePolicyRegistry', () => {
  it('defines a route policy at version 1, confirmed now', () => {
    const registry = new CompliancePolicyRegistry();
    const policy = registry.define({
      id: 'policy-direct-network',
      scope: 'route',
      route: 'direct-network',
      rules: baseRules,
      now: 1000,
    });
    expect(policy.version).toBe(1);
    expect(policy.lastConfirmedAt).toBe(1000);
    expect(policy.rules).toHaveLength(2);
  });

  it('rejects defining a policy with no rules', () => {
    const registry = new CompliancePolicyRegistry();
    expect(() =>
      registry.define({ id: 'p1', scope: 'route', route: 'direct-network', rules: [] })
    ).toThrow();
  });

  it('rejects an invalid route or scope', () => {
    const registry = new CompliancePolicyRegistry();
    expect(() =>
      registry.define({ id: 'p1', scope: 'route', route: 'not-a-route' as never, rules: baseRules })
    ).toThrow();
    expect(() =>
      registry.define({ id: 'p1', scope: 'not-a-scope' as never, route: 'direct-network', rules: baseRules })
    ).toThrow();
  });

  it('re-confirms the same rule set without bumping the version', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'p1', scope: 'route', route: 'direct-network', rules: baseRules, now: 1000 });
    const confirmed = registry.confirmSame('p1', 2000);
    expect(confirmed.version).toBe(1);
    expect(confirmed.lastConfirmedAt).toBe(2000);
  });

  it('revises the rule set, bumping the version and lastConfirmedAt', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'p1', scope: 'route', route: 'direct-network', rules: baseRules, now: 1000 });
    const revised = registry.reviseRules(
      'p1',
      [...baseRules, { id: 'must-check-references', kind: 'must', text: 'Contact the previous employer.' }],
      2000
    );
    expect(revised.version).toBe(2);
    expect(revised.lastConfirmedAt).toBe(2000);
    expect(revised.rules).toHaveLength(3);
  });

  it('adds and removes a single rule, bumping the version each time', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'p1', scope: 'route', route: 'job-posting', rules: baseRules, now: 1000 });
    const added = registry.addRule('p1', { id: 'must-not-scripted-posting', kind: 'must-not', text: 'No scripted auto-posting.' }, 2000);
    expect(added.version).toBe(2);
    expect(added.rules).toHaveLength(3);

    const removed = registry.removeRule('p1', 'must-not-scripted-posting', 3000);
    expect(removed.version).toBe(3);
    expect(removed.rules).toHaveLength(2);
  });

  it('rejects removing the last remaining rule', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'p1', scope: 'route', route: 'job-posting', rules: [baseRules[0]] });
    expect(() => registry.removeRule('p1', 'must-real-account')).toThrow();
  });

  it('reports whether a policy needs re-confirmation based on a cycle window', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'p1', scope: 'route', route: 'resume-intake', rules: baseRules, now: 1000 });
    expect(registry.needsReconfirmation('p1', 5000, 3000)).toBe(false);
    expect(registry.needsReconfirmation('p1', 5000, 7000)).toBe(true);
  });

  it('throws CompliancePolicyNotFoundError for an unknown policy', () => {
    const registry = new CompliancePolicyRegistry();
    expect(() => registry.confirmSame('missing')).toThrow(CompliancePolicyNotFoundError);
  });

  it('lists policies scoped to a route, optionally filtered by scope', () => {
    const registry = new CompliancePolicyRegistry();
    registry.define({ id: 'route-policy', scope: 'route', route: 'direct-network', rules: baseRules });
    registry.define({
      id: 'interview-policy',
      scope: 'interview-conduct',
      route: 'direct-network',
      rules: [{ id: 'must-be-professional', kind: 'must', text: 'Stay professional and on-topic.' }],
    });
    expect(registry.listForRoute('direct-network')).toHaveLength(2);
    expect(registry.listForRoute('direct-network', 'interview-conduct')).toHaveLength(1);
    expect(registry.listForRoute('job-posting')).toHaveLength(0);
  });
});
