import { ChannelBreakdownEntry, Channel, FunnelStage, FunnelStepMetrics, TrendPoint } from '../types/domain';
import { FunnelTracker } from './funnelAutomation';
import { InteractionLog } from './interactionLog';
import { Lead } from '../types/domain';

/**
 * Dashboard metrics module.
 *
 * Assembles the dashboard-reinforcement items from the brief that aren't
 * owned by a single existing module: trend sparklines, per-market funnel
 * conversion, channel breakdown, CSV export, and a timezone-safe clock.
 */

export const DASHBOARD_TIMEZONE = 'Asia/Dubai';
export const DASHBOARD_AUTO_REFRESH_MS = 60_000;

/** Current date/time resolved in the fixed Asia/Dubai timezone, not the caller's local clock. */
export function getDashboardClock(now: number = Date.now()): { isoDate: string; hour: number; weekday: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DASHBOARD_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(new Date(now));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';

  const year = get('year');
  const month = get('month');
  const day = get('day');
  // Some ICU implementations render midnight as "24"; normalize to 0.
  const rawHour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const weekdayShort = get('weekday');

  const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    isoDate: `${year}-${month}-${day}`,
    hour: rawHour + minute / 60 + second / 3600,
    weekday: WEEKDAY_INDEX[weekdayShort] ?? new Date(now).getUTCDay(),
  };
}

/** Builds a 7-day (or N-day) trend sparkline from a date->value map. Missing dates are filled with 0. */
export function buildTrendSparkline(params: { valuesByDate: Record<string, number>; endIsoDate: string; days?: number }): TrendPoint[] {
  const { valuesByDate, endIsoDate, days = 7 } = params;
  const points: TrendPoint[] = [];
  const end = new Date(`${endIsoDate}T00:00:00Z`);

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - i);
    const isoDate = d.toISOString().slice(0, 10);
    points.push({ date: isoDate, value: valuesByDate[isoDate] ?? 0 });
  }

  return points;
}

const FUNNEL_STAGE_ORDER: FunnelStage[] = [
  'new-lead',
  'contacted',
  'qualified',
  'meeting-scheduled',
  'meeting-completed',
  'booked',
];

/** Per-stage funnel counts + conversion rates for a set of leads (lead -> response -> meeting -> booking). */
export function computeFunnelBreakdown(leadIds: string[], funnel: FunnelTracker): FunnelStepMetrics[] {
  const totalLeads = leadIds.length;
  const stageCounts = new Map<FunnelStage, number>();

  for (const stage of FUNNEL_STAGE_ORDER) {
    // A lead "reaches" a stage if its current stage is at-or-past that stage in the funnel order.
    const stageIndex = FUNNEL_STAGE_ORDER.indexOf(stage);
    const count = leadIds.filter((id) => {
      const currentIndex = FUNNEL_STAGE_ORDER.indexOf(funnel.getStage(id));
      return currentIndex >= stageIndex;
    }).length;
    stageCounts.set(stage, count);
  }

  return FUNNEL_STAGE_ORDER.map((stage, index) => {
    const count = stageCounts.get(stage) ?? 0;
    const previousCount = index > 0 ? stageCounts.get(FUNNEL_STAGE_ORDER[index - 1]) ?? 0 : totalLeads;
    return {
      stage,
      count,
      conversionFromPrevious: previousCount > 0 ? count / previousCount : null,
      conversionFromStart: totalLeads > 0 ? count / totalLeads : 0,
    };
  });
}

/** Per-channel breakdown of response/meeting/booking rates for a set of leads. */
export function computeChannelBreakdown(
  leads: Lead[],
  funnel: FunnelTracker,
  interactionLog: InteractionLog
): ChannelBreakdownEntry[] {
  const byChannel = new Map<Channel, Lead[]>();
  for (const lead of leads) {
    const list = byChannel.get(lead.channel) ?? [];
    list.push(lead);
    byChannel.set(lead.channel, list);
  }

  const meetingStages = new Set<FunnelStage>(['meeting-scheduled', 'meeting-completed', 'booked']);

  return [...byChannel.entries()].map(([channel, channelLeads]) => {
    const totalLeads = channelLeads.length;
    const respondedCount = channelLeads.filter((l) => interactionLog.hasRespondedInbound(l.id)).length;
    const meetingCount = channelLeads.filter((l) => meetingStages.has(funnel.getStage(l.id))).length;
    const bookingCount = channelLeads.filter((l) => funnel.getStage(l.id) === 'booked').length;

    return {
      channel,
      totalLeads,
      respondedCount,
      meetingCount,
      bookingCount,
      responseRate: totalLeads > 0 ? respondedCount / totalLeads : 0,
      bookingRate: totalLeads > 0 ? bookingCount / totalLeads : 0,
    };
  });
}

/** One-click CSV export for a session's tabular data (e.g. rows of pacing/rollup entries). */
export function toCsv(rows: Array<Record<string, string | number | boolean | undefined>>): string {
  if (rows.length === 0) return '';

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  const escapeCell = (value: string | number | boolean | undefined): string => {
    if (value === undefined || value === null) return '';
    const str = String(value);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','));
  }
  return lines.join('\n');
}
