import { NotificationRegistry } from '../src/modules/notifications';

describe('NotificationRegistry', () => {
  it('schedules a notification with locale-complete title/body', () => {
    const registry = new NotificationRegistry();
    const notification = registry.schedule('child_1', 'friend-visited', { fa: 'a', ar: 'a', en: 'a' }, Date.now());
    expect(notification.title.en).toBeTruthy();
  });

  it('schedules a come-back nudge only after the inactivity threshold', () => {
    const registry = new NotificationRegistry();
    const now = 1_000_000;
    const lastActiveAt = now - 25 * 60 * 60 * 1000;
    const notification = registry.scheduleComeBackNudge('child_1', lastActiveAt, 24 * 60 * 60 * 1000, now);
    expect(notification).toBeDefined();
    expect(notification?.kind).toBe('city-is-alive-nudge');
  });

  it('does not schedule a come-back nudge before the inactivity threshold', () => {
    const registry = new NotificationRegistry();
    const now = 1_000_000;
    const lastActiveAt = now - 1000;
    expect(registry.scheduleComeBackNudge('child_1', lastActiveAt, 24 * 60 * 60 * 1000, now)).toBeUndefined();
  });

  it('marks a notification as sent and excludes it from pending', () => {
    const registry = new NotificationRegistry();
    const notification = registry.schedule('child_1', 'new-mission', { fa: 'a', ar: 'a', en: 'a' }, Date.now());
    expect(registry.pendingFor('child_1')).toHaveLength(1);
    registry.markSent(notification.id);
    expect(registry.pendingFor('child_1')).toHaveLength(0);
  });
});
