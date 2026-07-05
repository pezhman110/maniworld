import { buildDefaultChannelMap, ChannelAccountRegistry } from '../src/modules/channelMap';

describe('channelMap', () => {
  it('builds a default map covering every required platform', () => {
    const registry = buildDefaultChannelMap();
    const channels = registry.all().map((a) => a.channel);
    for (const expected of [
      'google', 'x', 'telegram', 'whatsapp', 'instagram', 'linkedin',
      'facebook', 'youtube', 'meta-ads', 'email', 'forum', 'phone', 'in-person', 'website',
    ]) {
      expect(channels).toContain(expected);
    }
  });

  it('every registered account has an owner, goal, kpi and access level', () => {
    const registry = buildDefaultChannelMap();
    for (const account of registry.all()) {
      expect(account.owner).toBeTruthy();
      expect(account.goal).toBeTruthy();
      expect(account.kpi).toBeTruthy();
      expect(['admin', 'editor', 'read-only']).toContain(account.accessLevel);
    }
  });

  it('supports registering, listing by channel and deactivating custom accounts', () => {
    const registry = new ChannelAccountRegistry();
    registry.register({
      channel: 'telegram',
      accountHandle: '@second_account',
      owner: 'ops',
      role: 'viewer',
      goal: 'backup',
      kpi: 'n/a',
      accessLevel: 'read-only',
      active: true,
    });

    expect(registry.listByChannel('telegram')).toHaveLength(1);
    registry.deactivate('telegram', '@second_account');
    expect(registry.get('telegram', '@second_account')?.active).toBe(false);
    expect(registry.listActive()).toHaveLength(0);
  });
});
