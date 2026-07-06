import { ScreenTimeRegistry } from '../src/modules/screenTimeSchedule';

describe('ScreenTimeRegistry', () => {
  it('allows any activity when no schedule has been configured yet', () => {
    const registry = new ScreenTimeRegistry();
    expect(registry.isAllowedNow('child_1', 'game', 10)).toBe(true);
  });

  it('allows an activity only within its configured window', () => {
    const registry = new ScreenTimeRegistry();
    registry.setSchedule('child_1', [{ activity: 'game', startHour: 16, endHour: 18 }]);
    expect(registry.isAllowedNow('child_1', 'game', 17)).toBe(true);
    expect(registry.isAllowedNow('child_1', 'game', 20)).toBe(false);
  });

  it('rejects an invalid window where endHour is not after startHour', () => {
    const registry = new ScreenTimeRegistry();
    expect(() => registry.setSchedule('child_1', [{ activity: 'tv', startHour: 18, endHour: 18 }])).toThrow();
  });

  it('rejects out-of-range hours', () => {
    const registry = new ScreenTimeRegistry();
    expect(() => registry.setSchedule('child_1', [{ activity: 'tv', startHour: -1, endHour: 5 }])).toThrow();
  });

  it('computes remaining minutes against a configured daily cap', () => {
    const registry = new ScreenTimeRegistry();
    registry.setSchedule('child_1', [{ activity: 'tv', startHour: 16, endHour: 19, maxMinutesPerDay: 60 }]);
    expect(registry.remainingMinutesToday('child_1', 'tv', 20)).toBe(40);
  });

  it('returns undefined remaining minutes when no cap is configured', () => {
    const registry = new ScreenTimeRegistry();
    registry.setSchedule('child_1', [{ activity: 'game', startHour: 16, endHour: 19 }]);
    expect(registry.remainingMinutesToday('child_1', 'game', 20)).toBeUndefined();
  });
});
