import { InterestTag, SongCatalogEntry, SongGenre } from '../types/domain';

/**
 * Song catalog module.
 *
 * Songs are configured data (a registry), not hardcoded UI lists, mirroring
 * the `MarketTargetRule` / `AgeBandRule` pattern used elsewhere in this repo
 * family: a designer can add/retire a song or retag it without touching the
 * session/creation engine.
 *
 * Two lookup paths match the two flows in the plan:
 *  - `searchByInterest`: the solo flow, where a child searches for a song
 *    matching what they like (animals, space, silly songs, ...).
 *  - `suggestForGroup`: the group flow, where a coach/teacher/system picks a
 *    song appropriate for the group size (enough singable parts to go around).
 */
export const DEFAULT_SONG_CATALOG: SongCatalogEntry[] = [
  {
    id: 'song-friendly-lion',
    title: 'The Friendly Lion',
    genre: 'sing-along',
    interestTags: ['animals', 'friendship', 'adventure'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 90,
    partCount: 2,
    description: 'A bouncy sing-along about a lion who just wants a friend.',
  },
  {
    id: 'song-rocket-to-the-moon',
    title: 'Rocket to the Moon',
    genre: 'pop',
    interestTags: ['space', 'adventure'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 100,
    partCount: 3,
    description: 'A countdown-and-blastoff song for future astronauts.',
  },
  {
    id: 'song-super-team',
    title: 'Super Team Go!',
    genre: 'pop',
    interestTags: ['superheroes', 'friendship'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 95,
    partCount: 4,
    description: 'A team-up anthem with a part for every hero in the group.',
  },
  {
    id: 'song-sleepy-star',
    title: 'Sleepy Little Star',
    genre: 'lullaby',
    interestTags: ['calm', 'family'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 80,
    partCount: 1,
    description: 'A gentle lullaby, perfect for a calm solo session.',
  },
  {
    id: 'song-silly-socks',
    title: 'Silly Socks Dance',
    genre: 'nursery-rhyme',
    interestTags: ['silly', 'friendship'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 70,
    partCount: 2,
    description: 'A goofy, giggly dance-along tune.',
  },
  {
    id: 'song-four-seasons-picnic',
    title: 'Four Seasons Picnic',
    genre: 'folk',
    interestTags: ['seasons', 'family'],
    minAge: 6,
    maxAge: 9,
    durationSeconds: 110,
    partCount: 4,
    description: 'A verse for each season, great for a bigger group.',
  },
];

export class UnknownSongError extends Error {
  constructor(songId: string) {
    super(`Unknown song id: ${songId}`);
    this.name = 'UnknownSongError';
  }
}

export class SongCatalogRegistry {
  private songs: SongCatalogEntry[];

  constructor(songs: SongCatalogEntry[] = DEFAULT_SONG_CATALOG) {
    this.songs = [...songs];
  }

  list(): SongCatalogEntry[] {
    return [...this.songs];
  }

  getById(songId: string): SongCatalogEntry {
    const song = this.songs.find((entry) => entry.id === songId);
    if (!song) {
      throw new UnknownSongError(songId);
    }
    return song;
  }

  byGenre(genre: SongGenre): SongCatalogEntry[] {
    return this.songs.filter((song) => song.genre === genre);
  }

  /**
   * Solo-flow search: a child looking for a song they like. Matches on any
   * overlapping interest tag and (optionally) a free-text query against the
   * title/description, ranked by number of matching tags (most relevant first).
   */
  searchByInterest(input: { interests?: InterestTag[]; query?: string; age?: number }): SongCatalogEntry[] {
    const interests = input.interests ?? [];
    const query = input.query?.trim().toLowerCase();

    const candidates = this.songs.filter((song) => {
      if (input.age !== undefined && (input.age < song.minAge || input.age > song.maxAge)) {
        return false;
      }
      const matchesQuery =
        !query || song.title.toLowerCase().includes(query) || song.description.toLowerCase().includes(query);
      return matchesQuery;
    });

    return candidates
      .map((song) => ({
        song,
        score: song.interestTags.filter((tag) => interests.includes(tag)).length,
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.song);
  }

  /**
   * Group-flow suggestion: coach/teacher/system picks a song with enough
   * distinct parts that every participant can have (at least) one, so no
   * one is left without something to sing/play.
   */
  suggestForGroup(participantCount: number): SongCatalogEntry[] {
    return this.songs
      .filter((song) => song.partCount >= Math.min(participantCount, 4))
      .sort((a, b) => b.partCount - a.partCount);
  }
}
