import { AccessControlRegistry, getRetentionPolicy, isExpired } from '../src/modules/security';

describe('security', () => {
  it('grants admin full wildcard access', () => {
    const registry = new AccessControlRegistry();
    registry.grant('user_1', 'admin');
    expect(registry.can('user_1', 'anything:goes')).toBe(true);
  });

  it('restricts viewer to read-only actions', () => {
    const registry = new AccessControlRegistry();
    registry.grant('user_2', 'viewer');
    expect(registry.can('user_2', 'lead:read')).toBe(true);
    expect(registry.can('user_2', 'lead:write')).toBe(false);
  });

  it('denies access for unknown users', () => {
    const registry = new AccessControlRegistry();
    expect(registry.can('ghost', 'lead:read')).toBe(false);
  });

  it('revokes access', () => {
    const registry = new AccessControlRegistry();
    registry.grant('user_3', 'sales');
    registry.revoke('user_3');
    expect(registry.can('user_3', 'lead:read')).toBe(false);
  });

  it('finds default retention policy for leads', () => {
    const policy = getRetentionPolicy('lead');
    expect(policy?.retentionDays).toBe(730);
  });

  it('flags a recording as expired after its retention window', () => {
    const now = 1000 * 24 * 60 * 60 * 1000; // day 1000
    const createdAt = 0;
    expect(isExpired('recording', createdAt, now)).toBe(true);
  });

  it('does not flag a lead as expired within its retention window', () => {
    const now = 10 * 24 * 60 * 60 * 1000; // day 10
    const createdAt = 0;
    expect(isExpired('lead', createdAt, now)).toBe(false);
  });
});
