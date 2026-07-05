import { MarketTargetRule, MarketType, TargetMetric, TargetOverride, TargetOverridePeriod } from '../types/domain';
import { DEFAULT_MARKET_TARGETS } from './marketTargets';
import { validateNonNegativeNumber } from './validation';

/**
 * Target override module.
 *
 * Lets a manager add/edit/remove daily, weekly, or per-branch/per-line
 * targets from the dashboard instead of the targets being fixed in code.
 * `resolveEffectiveTargets()` merges these overrides on top of
 * `DEFAULT_MARKET_TARGETS` for a given date, so pacing/rollup calculations
 * automatically pick up whatever the manager last configured.
 */

export class TargetOverrideStore {
  private overrides = new Map<string, TargetOverride>();
  private sequence = 0;

  /** Adds a new override. Use `update`/`remove` to edit or delete an existing one. */
  add(params: {
    market: MarketType;
    metric: TargetMetric;
    period: TargetOverridePeriod;
    date?: string;
    weekday?: number;
    locationId?: string;
    repId?: string;
    minPerDay?: number;
    maxPerDay?: number;
    note?: string;
    now?: number;
  }): TargetOverride {
    if (params.period === 'daily' && !params.date) {
      throw new Error('A "daily" target override requires a "date" (YYYY-MM-DD).');
    }
    if (params.period === 'weekly' && params.weekday === undefined) {
      throw new Error('A "weekly" target override requires a "weekday" (0-6).');
    }
    if (params.minPerDay !== undefined) validateNonNegativeNumber(params.minPerDay, 'minPerDay');
    if (params.maxPerDay !== undefined) validateNonNegativeNumber(params.maxPerDay, 'maxPerDay');

    this.sequence += 1;
    const now = params.now ?? Date.now();
    const override: TargetOverride = {
      id: `target_override_${this.sequence}`,
      market: params.market,
      metric: params.metric,
      period: params.period,
      date: params.date,
      weekday: params.weekday,
      locationId: params.locationId,
      repId: params.repId,
      minPerDay: params.minPerDay,
      maxPerDay: params.maxPerDay,
      note: params.note,
      createdAt: now,
      updatedAt: now,
    };
    this.overrides.set(override.id, override);
    return override;
  }

  update(id: string, patch: Partial<Omit<TargetOverride, 'id' | 'createdAt'>>, now: number = Date.now()): TargetOverride {
    const existing = this.overrides.get(id);
    if (!existing) throw new Error(`Target override "${id}" not found.`);
    if (patch.minPerDay !== undefined) validateNonNegativeNumber(patch.minPerDay, 'minPerDay');
    if (patch.maxPerDay !== undefined) validateNonNegativeNumber(patch.maxPerDay, 'maxPerDay');

    const updated: TargetOverride = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
    this.overrides.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.overrides.delete(id);
  }

  get(id: string): TargetOverride | undefined {
    return this.overrides.get(id);
  }

  list(): TargetOverride[] {
    return [...this.overrides.values()];
  }

  /** Overrides applicable to a specific market on a specific date/weekday. */
  listApplicable(market: MarketType, isoDate: string, weekday: number): TargetOverride[] {
    return this.list().filter(
      (o) =>
        o.market === market &&
        ((o.period === 'daily' && o.date === isoDate) || (o.period === 'weekly' && o.weekday === weekday))
    );
  }
}

/**
 * Merges configured overrides on top of the base rules for a given
 * market/date/weekday. A market-wide override (no `locationId`/`repId`)
 * replaces the base min/max; daily overrides take precedence over weekly
 * ones for the same metric.
 */
export function resolveEffectiveTargets(params: {
  market: MarketType;
  isoDate: string;
  weekday: number;
  store: TargetOverrideStore;
  baseRules?: MarketTargetRule[];
}): MarketTargetRule[] {
  const { market, isoDate, weekday, store, baseRules = DEFAULT_MARKET_TARGETS } = params;
  const applicable = store
    .listApplicable(market, isoDate, weekday)
    .filter((o) => !o.locationId && !o.repId)
    .sort((a, b) => (a.period === 'daily' ? 1 : 0) - (b.period === 'daily' ? 1 : 0)); // weekly first, daily last (wins)

  return baseRules
    .filter((r) => r.market === market)
    .map((rule) => {
      const override = [...applicable].reverse().find((o) => o.metric === rule.metric);
      if (!override) return rule;
      return {
        ...rule,
        minPerDay: override.minPerDay ?? rule.minPerDay,
        maxPerDay: override.maxPerDay ?? rule.maxPerDay,
      };
    });
}
