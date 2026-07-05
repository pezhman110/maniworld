import { PostgresRepository } from '../src/modules/postgresRepository';

/** Minimal mock of the `pg` Pool interface used by PostgresRepository. */
function createMockPool() {
  const query = jest.fn();
  return { query, pool: { query } as unknown as import('pg').Pool };
}

describe('PostgresRepository', () => {
  it('rejects unsafe table names to avoid SQL injection via identifiers', () => {
    const { pool } = createMockPool();
    expect(() => new PostgresRepository({ pool, table: 'leads; DROP TABLE leads;' })).toThrow();
    expect(() => new PostgresRepository({ pool, table: 'Leads' })).toThrow();
    expect(() => new PostgresRepository({ pool, table: 'leads' })).not.toThrow();
  });

  it('save() upserts a JSONB row keyed by id', async () => {
    const { pool, query } = createMockPool();
    query.mockResolvedValue({ rows: [], rowCount: 1 });
    const repo = new PostgresRepository<{ name: string }>({ pool, table: 'leads' });

    const result = await repo.save('lead_1', { name: 'Alice' });

    expect(result).toEqual({ name: 'Alice' });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO leads'), [
      'lead_1',
      JSON.stringify({ name: 'Alice' }),
    ]);
  });

  it('getById() returns the parsed JSONB payload', async () => {
    const { pool, query } = createMockPool();
    query.mockResolvedValue({ rows: [{ data: { name: 'Alice' } }] });
    const repo = new PostgresRepository<{ name: string }>({ pool, table: 'leads' });

    expect(await repo.getById('lead_1')).toEqual({ name: 'Alice' });
  });

  it('getById() returns undefined when no row matches', async () => {
    const { pool, query } = createMockPool();
    query.mockResolvedValue({ rows: [] });
    const repo = new PostgresRepository<{ name: string }>({ pool, table: 'leads' });

    expect(await repo.getById('missing')).toBeUndefined();
  });

  it('list() returns all rows in updated_at order', async () => {
    const { pool, query } = createMockPool();
    query.mockResolvedValue({ rows: [{ data: { name: 'Alice' } }, { data: { name: 'Bob' } }] });
    const repo = new PostgresRepository<{ name: string }>({ pool, table: 'leads' });

    expect(await repo.list()).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('delete() returns true only when a row was removed', async () => {
    const { pool, query } = createMockPool();
    const repo = new PostgresRepository<{ name: string }>({ pool, table: 'leads' });

    query.mockResolvedValueOnce({ rowCount: 1 });
    expect(await repo.delete('lead_1')).toBe(true);

    query.mockResolvedValueOnce({ rowCount: 0 });
    expect(await repo.delete('missing')).toBe(false);
  });
});
