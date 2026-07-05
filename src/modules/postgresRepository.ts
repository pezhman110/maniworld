import type { Pool } from 'pg';
import { Repository } from './persistence';

/**
 * Postgres/Supabase-backed repository.
 *
 * Stores each entity as a JSONB blob keyed by id in a dedicated table, so
 * any domain type from `src/types/domain.ts` can be persisted without a
 * bespoke schema per module. See `migrations/001_init.sql` for the table
 * definitions this expects (id text primary key, data jsonb, updated_at).
 *
 * Table names are restricted to a safe identifier pattern before being
 * interpolated into SQL, since parameterized queries cannot bind table
 * names.
 */

const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export interface PostgresRepositoryOptions {
  pool: Pool;
  /** Table name; must already exist (see migrations/001_init.sql). */
  table: string;
}

export class PostgresRepository<T> implements Repository<T> {
  private readonly table: string;
  private readonly pool: Pool;

  constructor(options: PostgresRepositoryOptions) {
    if (!SAFE_IDENTIFIER.test(options.table)) {
      throw new Error(`Invalid table name "${options.table}". Must match ${SAFE_IDENTIFIER}.`);
    }
    this.table = options.table;
    this.pool = options.pool;
  }

  async save(id: string, item: T): Promise<T> {
    await this.pool.query(
      `INSERT INTO ${this.table} (id, data, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [id, JSON.stringify(item)]
    );
    return item;
  }

  async getById(id: string): Promise<T | undefined> {
    const res = await this.pool.query(`SELECT data FROM ${this.table} WHERE id = $1`, [id]);
    return res.rows[0]?.data as T | undefined;
  }

  async list(): Promise<T[]> {
    const res = await this.pool.query(`SELECT data FROM ${this.table} ORDER BY updated_at ASC`);
    return res.rows.map((row: { data: T }) => row.data);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM ${this.table} WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}
