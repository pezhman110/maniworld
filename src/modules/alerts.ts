import { MarketPacingReport, ThresholdAlert } from '../types/domain';

/**
 * Threshold alerts.
 *
 * - Red: achieved-so-far has fallen below 50% of the expected-by-now floor
 *   line — a real, actionable shortfall, not just "slightly behind".
 * - Blue: achieved-so-far is already past the stretch (max) target — a
 *   signal to reallocate capacity/leads elsewhere rather than an alarm.
 */

const RED_THRESHOLD_RATIO = 0.5;

export function computeThresholdAlert(report: MarketPacingReport): ThresholdAlert {
  const { achievedSoFar, expectedByNowMin, maxPerDay, market, metric } = report;

  if (maxPerDay !== undefined && achievedSoFar > maxPerDay) {
    return {
      level: 'blue',
      message: `${market}/${metric}: above stretch target (${achievedSoFar} > ${maxPerDay}). You have spare capacity — reallocate leads/staff.`,
    };
  }

  if (expectedByNowMin > 0 && achievedSoFar < expectedByNowMin * RED_THRESHOLD_RATIO) {
    return {
      level: 'red',
      message: `${market}/${metric}: only ${achievedSoFar} vs. an expected ${expectedByNowMin.toFixed(
        1
      )} by now (< 50% of pace). Needs immediate attention.`,
    };
  }

  return { level: 'none', message: `${market}/${metric}: within normal pacing range.` };
}
