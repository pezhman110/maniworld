import { CityLifecycleRecord } from '../types/domain';

/**
 * Collapse City (extra request): a city is conceptually endless — it is
 * never "finished". A child can fold/"collapse" a city away into the
 * archive without hard-deleting it, and reopen it again later.
 */
export class CityLifecycleRegistry {
  private records = new Map<string, CityLifecycleRecord>();

  private ensure(cityId: string): CityLifecycleRecord {
    let record = this.records.get(cityId);
    if (!record) {
      record = { cityId, state: 'active' };
      this.records.set(cityId, record);
    }
    return record;
  }

  collapse(cityId: string, collapsedAt: number = Date.now()): CityLifecycleRecord {
    const record = this.ensure(cityId);
    if (record.state === 'collapsed') {
      throw new Error(`City ${cityId} is already collapsed.`);
    }
    record.state = 'collapsed';
    record.collapsedAt = collapsedAt;
    return record;
  }

  reopen(cityId: string, reopenedAt: number = Date.now()): CityLifecycleRecord {
    const record = this.ensure(cityId);
    if (record.state === 'active') {
      throw new Error(`City ${cityId} is already active.`);
    }
    record.state = 'active';
    record.reopenedAt = reopenedAt;
    return record;
  }

  isCollapsed(cityId: string): boolean {
    return this.ensure(cityId).state === 'collapsed';
  }

  getById(cityId: string): CityLifecycleRecord {
    return this.ensure(cityId);
  }
}
