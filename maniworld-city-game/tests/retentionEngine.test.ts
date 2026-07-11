import { ComebackRegistry, MemoryStreakRegistry } from '../src/modules/retentionEngine';

describe('MemoryStreakRegistry', () => {
  it('counts memories rather than consecutive days', () => {
    const registry = new MemoryStreakRegistry();
    registry.addMemory('c1', 'Built the first park');
    registry.addMemory('c1', 'Programmed a robot');
    expect(registry.memoryCount('c1')).toBe(2);
  });
});

describe('ComebackRegistry', () => {
  it('does not trigger a message before the inactivity threshold', () => {
    const registry = new ComebackRegistry();
    const now = Date.now();
    const message = registry.maybeTrigger('c1', now - 1000, now);
    expect(message).toBeUndefined();
  });

  it('sends a warm comeback message after the inactivity threshold', () => {
    const registry = new ComebackRegistry();
    const now = Date.now();
    const lastActiveAt = now - 4 * 24 * 60 * 60 * 1000;
    const message = registry.maybeTrigger('c1', lastActiveAt, now);
    expect(message).toBeDefined();
    expect(message?.message.length).toBeGreaterThan(0);
  });
});
