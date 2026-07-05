import { HourlyWeightCurve, MarketType, WorkingHours } from '../types/domain';
import { DEFAULT_WORKING_HOURS } from './locations';

/**
 * Hourly demand-weight curves.
 *
 * Real sales volume is not spread evenly across the working day: a salon is
 * quiet at 10am and busy in the evening, while B2B/investment activity
 * peaks around midday. Linear pacing ("hoursElapsed / totalHours * target")
 * makes mornings look falsely "behind" and evenings falsely "ahead".
 *
 * These are reasonable estimated curves (not measured data) — swap in real
 * historical hourly distributions per market/branch as soon as they're
 * available, by passing a custom curve to the pacing functions.
 */
export const DEFAULT_HOURLY_WEIGHTS: Record<MarketType, HourlyWeightCurve> = {
  // Salon: slow morning, steady afternoon, heavy evening rush before close.
  'salon-women': [
    { hour: 10, weight: 0.6 },
    { hour: 11, weight: 0.7 },
    { hour: 12, weight: 0.8 },
    { hour: 13, weight: 0.9 },
    { hour: 14, weight: 1.0 },
    { hour: 15, weight: 1.1 },
    { hour: 16, weight: 1.2 },
    { hour: 17, weight: 1.3 },
    { hour: 18, weight: 1.4 },
    { hour: 19, weight: 1.4 },
    { hour: 20, weight: 1.3 },
    { hour: 21, weight: 1.1 },
  ],
  // Home-service: same evening-heavy shape as the salon (bookings cluster after work hours).
  'home-service': [
    { hour: 10, weight: 0.6 },
    { hour: 11, weight: 0.7 },
    { hour: 12, weight: 0.8 },
    { hour: 13, weight: 0.9 },
    { hour: 14, weight: 1.0 },
    { hour: 15, weight: 1.1 },
    { hour: 16, weight: 1.2 },
    { hour: 17, weight: 1.3 },
    { hour: 18, weight: 1.4 },
    { hour: 19, weight: 1.4 },
    { hour: 20, weight: 1.3 },
    { hour: 21, weight: 1.1 },
  ],
  // Business-buying: B2B, peaks midday/early-afternoon, tapers in the evening.
  'business-buying': [
    { hour: 9, weight: 0.7 },
    { hour: 10, weight: 0.9 },
    { hour: 11, weight: 1.1 },
    { hour: 12, weight: 1.3 },
    { hour: 13, weight: 1.2 },
    { hour: 14, weight: 1.3 },
    { hour: 15, weight: 1.2 },
    { hour: 16, weight: 1.1 },
    { hour: 17, weight: 1.0 },
    { hour: 18, weight: 0.9 },
    { hour: 19, weight: 0.8 },
    { hour: 20, weight: 0.7 },
  ],
  // Business-selling: same midday/afternoon-heavy B2B shape.
  'business-selling': [
    { hour: 9, weight: 0.7 },
    { hour: 10, weight: 0.9 },
    { hour: 11, weight: 1.1 },
    { hour: 12, weight: 1.3 },
    { hour: 13, weight: 1.2 },
    { hour: 14, weight: 1.3 },
    { hour: 15, weight: 1.2 },
    { hour: 16, weight: 1.1 },
    { hour: 17, weight: 1.0 },
    { hour: 18, weight: 0.9 },
    { hour: 19, weight: 0.8 },
    { hour: 20, weight: 0.7 },
  ],
  // Investment: midday and afternoon are heaviest (decision-maker meeting hours).
  investment: [
    { hour: 9, weight: 0.7 },
    { hour: 10, weight: 1.0 },
    { hour: 11, weight: 1.2 },
    { hour: 12, weight: 1.3 },
    { hour: 13, weight: 1.1 },
    { hour: 14, weight: 1.3 },
    { hour: 15, weight: 1.3 },
    { hour: 16, weight: 1.2 },
    { hour: 17, weight: 1.0 },
    { hour: 18, weight: 0.9 },
    { hour: 19, weight: 0.8 },
    { hour: 20, weight: 0.7 },
  ],
};

/** Sorts and validates a curve, returning it filtered to the working-hours window. */
function curveWithinWindow(curve: HourlyWeightCurve, hours: WorkingHours): HourlyWeightCurve {
  return curve
    .filter((point) => point.hour >= hours.startHour && point.hour < hours.endHour)
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Fraction (0-1) of the day's expected volume that should have happened by
 * `currentHour`, according to the weighted curve — replaces the linear
 * `hoursElapsed / totalHours` assumption.
 */
export function weightedExpectedFraction(params: {
  market: MarketType;
  currentHour: number;
  workingHours?: WorkingHours;
  curve?: HourlyWeightCurve;
}): number {
  const workingHours = params.workingHours ?? DEFAULT_WORKING_HOURS[params.market];
  const rawCurve = params.curve ?? DEFAULT_HOURLY_WEIGHTS[params.market] ?? [];
  const curve = curveWithinWindow(rawCurve, workingHours);

  if (curve.length === 0) {
    // No curve available: fall back to the linear assumption.
    const totalHours = Math.max(0, workingHours.endHour - workingHours.startHour);
    if (totalHours === 0) return 1;
    const elapsed = Math.min(Math.max(0, params.currentHour - workingHours.startHour), totalHours);
    return elapsed / totalHours;
  }

  const totalWeight = curve.reduce((sum, p) => sum + p.weight, 0);
  if (totalWeight <= 0) return 0;

  const elapsedWeight = curve.reduce((sum, p) => {
    if (p.hour >= params.currentHour) return sum;
    // Each entry represents one full hour-block; partial credit for the hour
    // currently in progress keeps the curve continuous rather than stepped.
    const fractionOfHour = Math.min(1, Math.max(0, params.currentHour - p.hour));
    return sum + p.weight * fractionOfHour;
  }, 0);

  return Math.min(1, elapsedWeight / totalWeight);
}
