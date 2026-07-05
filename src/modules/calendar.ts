import { Holiday, MarketType, WeekdayOverride, WorkingHours } from '../types/domain';
import { DEFAULT_WORKING_HOURS } from './locations';

/**
 * Working calendar module.
 *
 * Targets are defined per calendar day, but not every day looks the same:
 * Friday (weekend in the UAE) runs shorter hours, public holidays may be
 * fully closed, and Ramadan shifts the whole working window. Without this,
 * a flat 7-days-a-week target gets applied to days it was never meant for.
 *
 * Dates are always treated as calendar dates in the Asia/Dubai timezone
 * (see `modules/dashboardMetrics.ts` for the timezone-safe clock).
 */

/** JS-style weekday index: 0 = Sunday ... 5 = Friday, 6 = Saturday. */
export const DEFAULT_WEEKDAY_OVERRIDES: WeekdayOverride[] = [
  // Friday: shorter day (weekend in the UAE) rather than fully closed.
  { weekday: 5, workingHours: { startHour: 14, endHour: 20 } },
];

export class WorkingCalendar {
  private holidays = new Map<string, Holiday>();
  private weekdayOverrides: WeekdayOverride[];

  constructor(params: { holidays?: Holiday[]; weekdayOverrides?: WeekdayOverride[] } = {}) {
    this.weekdayOverrides = params.weekdayOverrides ?? DEFAULT_WEEKDAY_OVERRIDES;
    for (const holiday of params.holidays ?? []) {
      this.holidays.set(holiday.date, holiday);
    }
  }

  addHoliday(holiday: Holiday): void {
    this.holidays.set(holiday.date, holiday);
  }

  getHoliday(isoDate: string): Holiday | undefined {
    return this.holidays.get(isoDate);
  }

  /** True unless the date is a fully-closed holiday. */
  isWorkingDay(isoDate: string, weekday: number): boolean {
    const holiday = this.holidays.get(isoDate);
    if (holiday?.closed) return false;

    const weekdayOverride = this.weekdayOverrides.find((w) => w.weekday === weekday);
    if (weekdayOverride?.closed) return false;

    return true;
  }

  /**
   * Resolves the effective working hours for a market on a given date,
   * applying (in priority order) a holiday override, a weekday override,
   * then the market's default hours.
   */
  getWorkingHours(market: MarketType, isoDate: string, weekday: number): WorkingHours {
    const holiday = this.holidays.get(isoDate);
    if (holiday?.adjustedHours) return holiday.adjustedHours;

    const weekdayOverride = this.weekdayOverrides.find((w) => w.weekday === weekday);
    if (weekdayOverride?.workingHours) return weekdayOverride.workingHours;

    return DEFAULT_WORKING_HOURS[market];
  }
}

/**
 * Convenience helper to build a calendar with a Ramadan window applied:
 * every day in `[startDate, endDate]` (inclusive, ISO dates) gets the
 * supplied shortened hours for every market.
 */
export function buildRamadanCalendar(params: {
  startDate: string;
  endDate: string;
  adjustedHours: WorkingHours;
  extraHolidays?: Holiday[];
  weekdayOverrides?: WeekdayOverride[];
}): WorkingCalendar {
  const holidays: Holiday[] = [...(params.extraHolidays ?? [])];

  for (
    let d = new Date(`${params.startDate}T00:00:00Z`);
    d.getTime() <= new Date(`${params.endDate}T00:00:00Z`).getTime();
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const isoDate = d.toISOString().slice(0, 10);
    holidays.push({ date: isoDate, label: 'Ramadan hours', adjustedHours: params.adjustedHours });
  }

  return new WorkingCalendar({ holidays, weekdayOverrides: params.weekdayOverrides });
}
