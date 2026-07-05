import { MarketTargetRule, MarketType, TargetMetric, WorkingHours } from '../types/domain';
import { DEFAULT_MARKET_TARGETS } from './marketTargets';
import { DEFAULT_WORKING_HOURS } from './locations';
import { InMemoryRepository, Repository } from './persistence';

/**
 * Market registry module.
 *
 * `MarketType` is a fixed TypeScript union (the 5 launch markets) so the
 * rest of the codebase can rely on it at compile time. But the dashboard
 * needs to let a manager add a brand-new market ("nature of the market")
 * without a code deploy. This module stores manager-defined market
 * definitions (id, label, working hours, daily target rules) in a
 * `Repository` (in-memory by default, Postgres/Supabase when wired up), and
 * exposes helpers that merge them with `DEFAULT_MARKET_TARGETS` /
 * `DEFAULT_WORKING_HOURS` so existing pacing/reporting code keeps working
 * unchanged for both built-in and custom markets (`computeMarketPacing`
 * already accepts `workingHours`/`rules` overrides for exactly this case).
 */

export interface CustomMarketDefinition {
  /** Unique market id, distinct from the built-in `MarketType` values. */
  id: string;
  label: string;
  workingHours: WorkingHours;
  targetRules: Array<{ metric: TargetMetric; minPerDay: number; maxPerDay?: number }>;
  createdAt: number;
  active: boolean;
}

export class DuplicateMarketError extends Error {
  constructor(id: string) {
    super(`A market with id "${id}" already exists.`);
    this.name = 'DuplicateMarketError';
  }
}

const BUILT_IN_MARKETS: readonly MarketType[] = [
  'salon-women',
  'home-service',
  'business-buying',
  'business-selling',
  'investment',
];

export class MarketRegistry {
  constructor(private repo: Repository<CustomMarketDefinition> = new InMemoryRepository()) {}

  async addMarket(params: {
    id: string;
    label: string;
    workingHours: WorkingHours;
    targetRules: Array<{ metric: TargetMetric; minPerDay: number; maxPerDay?: number }>;
    now?: number;
  }): Promise<CustomMarketDefinition> {
    if (!params.id.trim()) throw new Error('"id" is required.');
    if ((BUILT_IN_MARKETS as string[]).includes(params.id)) {
      throw new Error(`"${params.id}" is a built-in market; use a different id for a custom market.`);
    }
    if (await this.repo.getById(params.id)) {
      throw new DuplicateMarketError(params.id);
    }
    if (params.targetRules.length === 0) {
      throw new Error('A market needs at least one target rule.');
    }

    const definition: CustomMarketDefinition = {
      id: params.id,
      label: params.label,
      workingHours: params.workingHours,
      targetRules: params.targetRules,
      createdAt: params.now ?? Date.now(),
      active: true,
    };
    await this.repo.save(definition.id, definition);
    return definition;
  }

  async updateMarket(
    id: string,
    patch: Partial<Pick<CustomMarketDefinition, 'label' | 'workingHours' | 'targetRules' | 'active'>>
  ): Promise<CustomMarketDefinition> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new Error(`Market "${id}" not found.`);
    const updated: CustomMarketDefinition = { ...existing, ...patch };
    await this.repo.save(id, updated);
    return updated;
  }

  async removeMarket(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async getMarket(id: string): Promise<CustomMarketDefinition | undefined> {
    return this.repo.getById(id);
  }

  async listMarkets(onlyActive = true): Promise<CustomMarketDefinition[]> {
    const all = await this.repo.list();
    return onlyActive ? all.filter((m) => m.active) : all;
  }

  /** All target rules across custom markets, shaped like `MarketTargetRule` (market is the custom market id). */
  async getCustomTargetRules(): Promise<MarketTargetRule[]> {
    const markets = await this.listMarkets();
    return markets.flatMap((market) =>
      market.targetRules.map((rule) => ({
        market: market.id as MarketType,
        metric: rule.metric,
        minPerDay: rule.minPerDay,
        maxPerDay: rule.maxPerDay,
      }))
    );
  }

  /** Built-in + custom target rules combined, ready to pass as `rules` to `computeMarketPacing`. */
  async getEffectiveTargetRules(): Promise<MarketTargetRule[]> {
    return [...DEFAULT_MARKET_TARGETS, ...(await this.getCustomTargetRules())];
  }

  /** Resolves working hours for either a built-in market or a registered custom market. */
  async getEffectiveWorkingHours(marketId: string): Promise<WorkingHours | undefined> {
    if ((BUILT_IN_MARKETS as string[]).includes(marketId)) {
      return DEFAULT_WORKING_HOURS[marketId as MarketType];
    }
    const custom = await this.getMarket(marketId);
    return custom?.workingHours;
  }
}
