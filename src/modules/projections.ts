import { MarketPacingReport, MultiplierStatus, RequiredMultiplier, RunRateProjection } from '../types/domain';

/**
 * Projections module.
 *
 * Two operational, decision-ready numbers:
 *  - Run-rate projection: "at the current pace, where do we land by close?"
 *  - Required multiplier: "how much faster does the rest of the day need to
 *    be to still hit the floor target?" — the concrete "2x / half" answer.
 *
 * Neither ever returns `Infinity`: a zero current rate with time still
 * remaining reports `multiplier: null` with an explicit status instead of
 * dividing by zero.
 */

export function computeRunRateProjection(report: MarketPacingReport): RunRateProjection {
  const { achievedSoFar, hoursElapsed, hoursRemaining, minPerDay, maxPerDay } = report;

  const currentRatePerHour = hoursElapsed > 0 ? achievedSoFar / hoursElapsed : 0;
  const projectedAdditional = currentRatePerHour * hoursRemaining;
  const projectedEndOfDay = achievedSoFar + projectedAdditional;

  return {
    currentRatePerHour,
    hoursRemaining,
    projectedAdditional,
    projectedEndOfDay,
    projectedPercentOfMin: minPerDay > 0 ? (projectedEndOfDay / minPerDay) * 100 : 100,
    projectedPercentOfMax: maxPerDay !== undefined && maxPerDay > 0 ? (projectedEndOfDay / maxPerDay) * 100 : undefined,
  };
}

export function computeRequiredMultiplier(report: MarketPacingReport): RequiredMultiplier {
  const { achievedSoFar, hoursElapsed, hoursRemaining, minPerDay, remainingNeededForMin } = report;

  const currentRatePerHour = hoursElapsed > 0 ? achievedSoFar / hoursElapsed : 0;

  if (hoursRemaining <= 0) {
    const status: MultiplierStatus = achievedSoFar >= minPerDay ? 'on-track' : 'missed';
    return { currentRatePerHour, requiredRatePerHour: 0, multiplier: null, status };
  }

  const requiredRatePerHour = remainingNeededForMin / hoursRemaining;

  if (currentRatePerHour <= 0) {
    return {
      currentRatePerHour,
      requiredRatePerHour,
      multiplier: null,
      status: requiredRatePerHour > 0 ? 'needs-boost' : 'on-track',
    };
  }

  const multiplier = requiredRatePerHour / currentRatePerHour;
  const status: MultiplierStatus = multiplier <= 1 ? 'on-track' : 'needs-boost';

  return { currentRatePerHour, requiredRatePerHour, multiplier, status };
}
