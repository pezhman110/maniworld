import { ScreenTimeActivity, ScreenTimeSchedule, ScreenTimeWindow } from '../types/domain';

/**
 * Screen-Time Schedule (extra request): parent-configurable daily windows
 * for "game" vs "TV" time, so the ever-growing city doesn't crowd out
 * other parts of a child's day. Purely a scheduling/allow-check data
 * model — actual OS-level app/device locking is out of scope.
 */
export class ScreenTimeRegistry {
  private schedules = new Map<string, ScreenTimeSchedule>();

  setSchedule(childId: string, windows: ScreenTimeWindow[]): ScreenTimeSchedule {
    windows.forEach((window) => this.assertValidWindow(window));
    const schedule: ScreenTimeSchedule = { childId, windows: [...windows] };
    this.schedules.set(childId, schedule);
    return schedule;
  }

  private assertValidWindow(window: ScreenTimeWindow): void {
    if (window.startHour < 0 || window.startHour > 23 || window.endHour < 0 || window.endHour > 23) {
      throw new Error('Screen-time window hours must be between 0 and 23.');
    }
    if (window.endHour <= window.startHour) {
      throw new Error('Screen-time window endHour must be after startHour; split overnight windows into two entries.');
    }
  }

  getSchedule(childId: string): ScreenTimeSchedule | undefined {
    return this.schedules.get(childId);
  }

  /** Whether the given activity is currently allowed for the child at the given hour (0-23, local time). */
  isAllowedNow(childId: string, activity: ScreenTimeActivity, hour: number): boolean {
    const schedule = this.schedules.get(childId);
    if (!schedule) {
      return true; // No restriction configured yet — parent hasn't set one up.
    }
    return schedule.windows.some((window) => window.activity === activity && hour >= window.startHour && hour < window.endHour);
  }

  /** Minutes already used today for an activity vs. the configured daily cap, if any. */
  remainingMinutesToday(childId: string, activity: ScreenTimeActivity, minutesUsedToday: number): number | undefined {
    const schedule = this.schedules.get(childId);
    const window = schedule?.windows.find((candidate) => candidate.activity === activity && candidate.maxMinutesPerDay !== undefined);
    if (!window || window.maxMinutesPerDay === undefined) {
      return undefined;
    }
    return Math.max(0, window.maxMinutesPerDay - minutesUsedToday);
  }
}
