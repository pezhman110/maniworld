import { InMemoryRepository } from '../src/modules/persistence';

describe('InMemoryRepository', () => {
  it('saves, retrieves, lists and deletes items', async () => {
    const repo = new InMemoryRepository<{ name: string }>();

    await repo.save('a', { name: 'Alice' });
    await repo.save('b', { name: 'Bob' });

    expect(await repo.getById('a')).toEqual({ name: 'Alice' });
    expect(await repo.list()).toHaveLength(2);

    expect(await repo.delete('a')).toBe(true);
    expect(await repo.getById('a')).toBeUndefined();
    expect(await repo.list()).toHaveLength(1);
  });

  it('returns false when deleting a missing id', async () => {
    const repo = new InMemoryRepository<{ name: string }>();
    expect(await repo.delete('missing')).toBe(false);
  });

  it('overwrites an item saved with the same id', async () => {
    const repo = new InMemoryRepository<{ name: string }>();
    await repo.save('a', { name: 'Alice' });
    await repo.save('a', { name: 'Alicia' });
    expect(await repo.getById('a')).toEqual({ name: 'Alicia' });
    expect(await repo.list()).toHaveLength(1);
  });
});
