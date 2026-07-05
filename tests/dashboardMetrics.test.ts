import {
  buildTrendSparkline,
  computeChannelBreakdown,
  computeFunnelBreakdown,
  DASHBOARD_AUTO_REFRESH_MS,
  DASHBOARD_TIMEZONE,
  getDashboardClock,
  toCsv,
} from '../src/modules/dashboardMetrics';
import { FunnelTracker } from '../src/modules/funnelAutomation';
import { InteractionLog } from '../src/modules/interactionLog';
import { Lead } from '../src/types/domain';

describe('dashboardMetrics', () => {
  it('exposes the Asia/Dubai timezone and a 60s auto-refresh interval', () => {
    expect(DASHBOARD_TIMEZONE).toBe('Asia/Dubai');
    expect(DASHBOARD_AUTO_REFRESH_MS).toBe(60_000);
  });

  it('resolves the clock in Asia/Dubai regardless of the host timezone', () => {
    // 2024-06-10T20:00:00Z -> Asia/Dubai is UTC+4 -> 2024-06-11 00:00 local.
    const clock = getDashboardClock(new Date('2024-06-10T20:00:00Z').getTime());
    expect(clock.isoDate).toBe('2024-06-11');
    expect(clock.hour).toBeCloseTo(0, 1);
  });

  it('builds a 7-day trend sparkline, filling missing dates with 0', () => {
    const points = buildTrendSparkline({
      valuesByDate: { '2024-06-10': 90, '2024-06-08': 85 },
      endIsoDate: '2024-06-10',
    });

    expect(points).toHaveLength(7);
    expect(points[points.length - 1]).toEqual({ date: '2024-06-10', value: 90 });
    expect(points.find((p) => p.date === '2024-06-09')?.value).toBe(0);
  });

  it('computes per-stage funnel counts and conversion rates', () => {
    const funnel = new FunnelTracker();
    funnel.transition('lead_1', 'contacted', 'agent');
    funnel.transition('lead_1', 'qualified', 'agent');
    funnel.transition('lead_2', 'contacted', 'agent');

    const breakdown = computeFunnelBreakdown(['lead_1', 'lead_2', 'lead_3'], funnel);
    const contacted = breakdown.find((s) => s.stage === 'contacted')!;
    const qualified = breakdown.find((s) => s.stage === 'qualified')!;

    expect(contacted.count).toBe(2); // lead_1 (qualified, past contacted) + lead_2
    expect(qualified.count).toBe(1);
    expect(contacted.conversionFromStart).toBeCloseTo(2 / 3, 5);
    expect(qualified.conversionFromPrevious).toBeCloseTo(1 / 2, 5);
  });

  it('computes channel breakdown (response/meeting/booking rate per channel)', () => {
    const funnel = new FunnelTracker();
    const log = new InteractionLog();

    const leads: Lead[] = [
      { id: 'l1', fullName: 'A', phone: '1', normalizedPhone: '1', channel: 'instagram', consent: 'granted', createdAt: 0, isDuplicate: false, isSpam: false },
      { id: 'l2', fullName: 'B', phone: '2', normalizedPhone: '2', channel: 'instagram', consent: 'granted', createdAt: 0, isDuplicate: false, isSpam: false },
      { id: 'l3', fullName: 'C', phone: '3', normalizedPhone: '3', channel: 'meta-ads', consent: 'granted', createdAt: 0, isDuplicate: false, isSpam: false },
    ];

    log.record({ leadId: 'l1', channel: 'instagram', type: 'message', direction: 'inbound', summary: 'reply', actor: 'lead' });
    funnel.transition('l1', 'contacted', 'agent');
    funnel.transition('l1', 'booked', 'agent');

    const breakdown = computeChannelBreakdown(leads, funnel, log);
    const instagram = breakdown.find((c) => c.channel === 'instagram')!;
    const metaAds = breakdown.find((c) => c.channel === 'meta-ads')!;

    expect(instagram.totalLeads).toBe(2);
    expect(instagram.bookingCount).toBe(1);
    expect(instagram.bookingRate).toBeCloseTo(0.5, 5);
    expect(metaAds.totalLeads).toBe(1);
    expect(metaAds.bookingRate).toBe(0);
  });

  it('exports rows to CSV, quoting values that contain commas/quotes/newlines', () => {
    const csv = toCsv([
      { market: 'salon-women', achieved: 90, note: 'on track' },
      { market: 'investment', achieved: 40, note: 'needs "boost", fast' },
    ]);

    const lines = csv.split('\n');
    expect(lines[0]).toBe('market,achieved,note');
    expect(lines[2]).toContain('"needs ""boost"", fast"');
  });

  it('returns an empty string for an empty row set', () => {
    expect(toCsv([])).toBe('');
  });
});
