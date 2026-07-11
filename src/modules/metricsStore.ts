import { validateNonNegativeNumber } from './validation';

/**
 * Server-side metrics store.
 *
 * Numbers entered into the dashboard must survive a page reload. Storing
 * them only in the browser (localStorage/component state) loses them the
 * moment a device is swapped or the tab is closed. This module models that
 * state server-side instead: an in-memory reference implementation here,
 * designed to be backed by a real database (Redis/Postgres/etc.) by
 * swapping the storage layer without changing the call sites.
 */

export interface MetricsStoreEntry {
  market: string;
  metric: string;
  /** ISO date (YYYY-MM-DD) the count applies to. */
  date: string;
  locationId?: string;
  repId?: string;
  value: number;
  updatedAt: number;
}

function entryKey(params: { market: string; metric: string; date: string; locationId?: string; repId?: string }): string {
  return [params.market, params.metric, params.date, params.locationId ?? '*', params.repId ?? '*'].join('|');
}

export class MetricsStore {
  private entries = new Map<string, MetricsStoreEntry>();

  /** Records/overwrites the achieved count for a market+metric+date (+ optional branch/rep). */
  set(params: {
    market: string;
    metric: string;
    date: string;
    locationId?: string;
    repId?: string;
    value: number;
    now?: number;
  }): MetricsStoreEntry {
    const value = validateNonNegativeNumber(params.value, `${params.market}/${params.metric}`);
    const entry: MetricsStoreEntry = {
      market: params.market,
      metric: params.metric,
      date: params.date,
      locationId: params.locationId,
      repId: params.repId,
      value,
      updatedAt: params.now ?? Date.now(),
    };
    this.entries.set(entryKey(params), entry);
    return entry;
  }

  get(params: { market: string; metric: string; date: string; locationId?: string; repId?: string }): number {
    return this.entries.get(entryKey(params))?.value ?? 0;
  }

  getEntry(params: {
    market: string;
    metric: string;
    date: string;
    locationId?: string;
    repId?: string;
  }): MetricsStoreEntry | undefined {
    return this.entries.get(entryKey(params));
  }

  /** All entries recorded for a given date, across markets/metrics/branches. */
  listByDate(date: string): MetricsStoreEntry[] {
    return [...this.entries.values()].filter((e) => e.date === date);
  }

  /** All entries recorded for a given market, across dates. Useful for building trend sparklines. */
  listByMarket(market: string): MetricsStoreEntry[] {
    return [...this.entries.values()].filter((e) => e.market === market);
  }

  all(): MetricsStoreEntry[] {
    return [...this.entries.values()];
  }
}
