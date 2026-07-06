import { SongCatalogRegistry, UnknownSongError } from '../src/modules/songCatalog';

describe('SongCatalogRegistry', () => {
  const catalog = new SongCatalogRegistry();

  it('lists all seeded songs', () => {
    expect(catalog.list().length).toBeGreaterThan(0);
  });

  it('gets a song by id', () => {
    const song = catalog.getById('song-rocket-to-the-moon');
    expect(song.title).toBe('Rocket to the Moon');
  });

  it('throws for an unknown song id', () => {
    expect(() => catalog.getById('nope')).toThrow(UnknownSongError);
  });

  it('filters by genre', () => {
    const lullabies = catalog.byGenre('lullaby');
    expect(lullabies.every((song) => song.genre === 'lullaby')).toBe(true);
    expect(lullabies.length).toBeGreaterThan(0);
  });

  describe('searchByInterest (solo flow)', () => {
    it('ranks songs with more matching interest tags first', () => {
      const results = catalog.searchByInterest({ interests: ['space', 'adventure'] });
      expect(results[0].id).toBe('song-rocket-to-the-moon');
    });

    it('filters by free-text query', () => {
      const results = catalog.searchByInterest({ query: 'lion' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('song-friendly-lion');
    });

    it('filters out songs outside the given age range', () => {
      const results = catalog.searchByInterest({ age: 5 });
      expect(results).toHaveLength(0);
    });

    it('returns all age-appropriate songs when no interests/query given', () => {
      const results = catalog.searchByInterest({ age: 7 });
      expect(results.length).toBe(catalog.list().length);
    });
  });

  describe('suggestForGroup (group flow)', () => {
    it('suggests songs with enough parts for the group, biggest part-count first', () => {
      const results = catalog.suggestForGroup(4);
      expect(results.every((song) => song.partCount >= 4)).toBe(true);
      expect(results[0].partCount).toBeGreaterThanOrEqual(results[results.length - 1].partCount);
    });

    it('caps the required part count at 4 for larger groups', () => {
      const resultsForFive = catalog.suggestForGroup(5);
      const resultsForFour = catalog.suggestForGroup(4);
      expect(resultsForFive.map((s) => s.id)).toEqual(resultsForFour.map((s) => s.id));
    });
  });
});
