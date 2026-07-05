import { MarketPacingReport, MarketTargetRule, MarketType, TargetMetric, WorkingHours } from '../types/domain';
import { DEFAULT_WORKING_HOURS } from './locations';

/**
 * Market targets module.
 *
 * Encodes the daily confirmed-outcome targets from the brief, per market:
 *  - salon-women:      90-110 confirmed bookings/day
 *  - home-service:     90-110 confirmed bookings/day
 *  - business-buying:  50-70 online sessions/day, 30-40 in-person meetings/day (at the office address)
 *  - business-selling: 30 confirmed online contacts/day
 *  - investment:       70 in-person meetings/day, 70+ online sessions/day
 *
 * It also turns "how am I doing right now?" into a concrete, hourly-updatable
 * pacing report: given the market's working-hours window and how many hours
 * have elapsed today, it tells you whether you're on pace to hit the minimum
 * target and how much is still needed per remaining hour — the "weakness"
 * signal the brief asked for.
 */

export const DEFAULT_MARKET_TARGETS: MarketTargetRule[] = [
  { market: 'salon-women', metric: 'confirmed-booking', minPerDay: 90, maxPerDay: 110 },
  { market: 'home-service', metric: 'confirmed-booking', minPerDay: 90, maxPerDay: 110 },
  { market: 'business-buying', metric: 'online-session', minPerDay: 50, maxPerDay: 70 },
  { market: 'business-buying', metric: 'in-person-meeting', minPerDay: 30, maxPerDay: 40 },
  { market: 'business-selling', metric: 'online-contact', minPerDay: 30, maxPerDay: 30 },
  { market: 'investment', metric: 'in-person-meeting', minPerDay: 70, maxPerDay: 70 },
  { market: 'investment', metric: 'online-session', minPerDay: 70, maxPerDay: Number.POSITIVE_INFINITY },
];

export function findTargetRule(
  market: MarketType,
  metric: TargetMetric,
  rules: MarketTargetRule[] = DEFAULT_MARKET_TARGETS
): MarketTargetRule | undefined {
  return rules.find((r) => r.market === market && r.metric === metric);
}

function hoursInWindow(hours: WorkingHours): number {
  return Math.max(0, hours.endHour - hours.startHour);
}

/** Clamps `hour` (0-23, may be fractional) to how many working hours have elapsed so far today. */
function elapsedWorkingHours(hours: WorkingHours, currentHour: number): number {
  if (currentHour <= hours.startHour) return 0;
  if (currentHour >= hours.endHour) return hoursInWindow(hours);
  return currentHour - hours.startHour;
}

/**
 * Computes a real-time/hourly pacing report for one market + metric.
 *
 * @param achievedSoFar confirmed count for the metric so far today
 * @param currentHour   current local hour (0-23, fractional allowed for e.g. 14.5)
 * @param workingHours  overrides the market's default window if supplied
 */
export function computeMarketPacing(params: {
  market: MarketType;
  metric: TargetMetric;
  achievedSoFar: number;
  currentHour: number;
  workingHours?: WorkingHours;
  rules?: MarketTargetRule[];
}): MarketPacingReport {
  const { market, metric, achievedSoFar, currentHour, rules = DEFAULT_MARKET_TARGETS } = params;
  const workingHours = params.workingHours ?? DEFAULT_WORKING_HOURS[market];
  const rule = findTargetRule(market, metric, rules);

  if (!rule) {
    throw new Error(`No target rule defined for market "${market}" / metric "${metric}".`);
  }

  const totalHours = hoursInWindow(workingHours);
  const hoursElapsed = elapsedWorkingHours(workingHours, currentHour);
  const hoursRemaining = Math.max(0, totalHours - hoursElapsed);

  const expectedByNowMin = totalHours === 0 ? rule.minPerDay : (rule.minPerDay * hoursElapsed) / totalHours;
  const remainingNeededForMin = Math.max(0, rule.minPerDay - achievedSoFar);
  const requiredPerRemainingHour = hoursRemaining > 0 ? remainingNeededForMin / hoursRemaining : remainingNeededForMin;

  return {
    market,
    metric,
    minPerDay: rule.minPerDay,
    maxPerDay: rule.maxPerDay,
    achievedSoFar,
    hoursElapsed,
    hoursRemaining,
    expectedByNowMin,
    onTrackForMin: achievedSoFar >= expectedByNowMin,
    remainingNeededForMin,
    requiredPerRemainingHour,
    isBelowTarget: achievedSoFar < expectedByNowMin,
    isAboveMax: achievedSoFar > rule.maxPerDay,
  };
}

/** Convenience helper to run pacing for every configured metric of a market at once. */
export function computeMarketPacingForAllMetrics(params: {
  market: MarketType;
  achievedByMetric: Partial<Record<TargetMetric, number>>;
  currentHour: number;
  workingHours?: WorkingHours;
  rules?: MarketTargetRule[];
}): MarketPacingReport[] {
  const { market, achievedByMetric, currentHour, workingHours, rules = DEFAULT_MARKET_TARGETS } = params;

  return rules
    .filter((r) => r.market === market)
    .map((r) =>
      computeMarketPacing({
        market,
        metric: r.metric,
        achievedSoFar: achievedByMetric[r.metric] ?? 0,
        currentHour,
        workingHours,
        rules,
      })
    );
}
