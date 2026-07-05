import { BranchRepTarget, RollupEntry } from '../types/domain';

/**
 * Per-branch / per-rep rollup module.
 *
 * Market-level targets ("90-110 confirmed bookings/day for salon-women")
 * hide *where* a shortfall is coming from. This breaks the same target
 * down to each branch (and, optionally, each sales rep within a branch) so
 * a manager can see exactly which location/person is behind.
 */

export function computeRollup(params: {
  targets: BranchRepTarget[];
  /** Achieved count keyed by `locationId` (or `${locationId}:${repId}` when tracking per-rep). */
  achievedByKey: Record<string, number>;
  locationNames?: Record<string, string>;
}): RollupEntry[] {
  const { targets, achievedByKey, locationNames = {} } = params;

  return targets.map((target) => {
    const key = target.repId ? `${target.locationId}:${target.repId}` : target.locationId;
    const achievedSoFar = achievedByKey[key] ?? 0;
    const gapToMin = Math.max(0, target.minPerDay - achievedSoFar);
    const percentOfMin = target.minPerDay > 0 ? (achievedSoFar / target.minPerDay) * 100 : 100;

    return {
      locationId: target.locationId,
      locationName: locationNames[target.locationId],
      repId: target.repId,
      minPerDay: target.minPerDay,
      maxPerDay: target.maxPerDay,
      achievedSoFar,
      gapToMin,
      percentOfMin,
    };
  });
}

/** Splits a market-level minimum target evenly across a set of branches (or reps), by headcount weight. */
export function splitTargetByHeadcount(params: {
  market: BranchRepTarget['market'];
  metric: BranchRepTarget['metric'];
  minPerDay: number;
  maxPerDay?: number;
  locations: Array<{ locationId: string; repId?: string; staffCount: number }>;
}): BranchRepTarget[] {
  const { market, metric, minPerDay, maxPerDay, locations } = params;
  const totalStaff = locations.reduce((sum, l) => sum + Math.max(0, l.staffCount), 0);

  if (totalStaff <= 0) {
    // No headcount info: split evenly across the locations instead.
    const share = locations.length > 0 ? 1 / locations.length : 0;
    return locations.map((l) => ({
      market,
      metric,
      locationId: l.locationId,
      repId: l.repId,
      minPerDay: minPerDay * share,
      maxPerDay: maxPerDay !== undefined ? maxPerDay * share : undefined,
    }));
  }

  return locations.map((l) => {
    const share = l.staffCount / totalStaff;
    return {
      market,
      metric,
      locationId: l.locationId,
      repId: l.repId,
      minPerDay: minPerDay * share,
      maxPerDay: maxPerDay !== undefined ? maxPerDay * share : undefined,
    };
  });
}
