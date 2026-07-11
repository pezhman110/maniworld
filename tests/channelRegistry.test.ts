import { ChannelRegistry } from '../src/modules/channelRegistry';

describe('channelRegistry', () => {
  it('lets a manager manually add an extra site/social to track', () => {
    const registry = new ChannelRegistry();
    const entry = registry.add({
      label: 'Extra Instagram page',
      url: 'https://instagram.com/maniworld_extra',
      type: 'social',
      addedBy: 'manager',
    });

    expect(registry.get(entry.id)).toMatchObject({ label: 'Extra Instagram page', active: true });
    expect(registry.list()).toHaveLength(1);
  });

  it('rejects an entry with an empty label or an invalid URL', () => {
    const registry = new ChannelRegistry();
    expect(() => registry.add({ label: '  ', url: 'https://x.com', type: 'social', addedBy: 'manager' })).toThrow();
    expect(() => registry.add({ label: 'Bad', url: 'not-a-url', type: 'social', addedBy: 'manager' })).toThrow();
  });

  it('updates, deactivates and removes an entry', () => {
    const registry = new ChannelRegistry();
    const entry = registry.add({ label: 'Site', url: 'https://example.com', type: 'website', addedBy: 'manager' });

    registry.update(entry.id, { notes: 'Landing page for ads' });
    expect(registry.get(entry.id)?.notes).toBe('Landing page for ads');

    expect(registry.deactivate(entry.id)).toBe(true);
    expect(registry.list()).toHaveLength(0);
    expect(registry.list(false)).toHaveLength(1);

    expect(registry.remove(entry.id)).toBe(true);
  });

  it('filters entries by type', () => {
    const registry = new ChannelRegistry();
    registry.add({ label: 'Site', url: 'https://example.com', type: 'website', addedBy: 'manager' });
    registry.add({ label: 'Insta', url: 'https://instagram.com/x', type: 'social', addedBy: 'manager' });

    expect(registry.byType('social')).toHaveLength(1);
    expect(registry.byType('website')).toHaveLength(1);
  });
});
