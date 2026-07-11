/**
 * Persistence layer.
 *
 * Every domain module in this library keeps its state in memory, which is
 * fine for pure computation/tests but not for production. This module
 * defines a small storage-agnostic `Repository<T>` contract plus an
 * in-memory implementation (used everywhere by default, preserving current
 * behavior) so a real backend (Postgres/Supabase, see
 * `postgresRepository.ts`) can be swapped in without touching business
 * logic modules.
 */

export interface Repository<T> {
  save(id: string, item: T): Promise<T>;
  getById(id: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  delete(id: string): Promise<boolean>;
}

/** Default, zero-dependency storage: an in-memory map. Data is lost on restart. */
export class InMemoryRepository<T> implements Repository<T> {
  private store = new Map<string, T>();

  async save(id: string, item: T): Promise<T> {
    this.store.set(id, item);
    return item;
  }

  async getById(id: string): Promise<T | undefined> {
    return this.store.get(id);
  }

  async list(): Promise<T[]> {
    return [...this.store.values()];
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
