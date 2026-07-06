import { CityScoreInputs, DailyLeaderboardSnapshot, LeaderboardEntry } from '../types/domain';

/**
 * Daily Leaderboard (extra request): ranks cities by a configurable score
 * and recomputes once per day, exposing "today's top city". Framed
 * non-punitively — like `retentionEngine.ts` in the sibling project, this
 * is meant to celebrate, never to shame a child whose city ranks lower.
 */
export function computeCityScore(inputs: CityScoreInputs, weights: { building: number; resident: number; happiness: number } = { building: 10, resident: 15, happiness: 1 }): number {
  return inputs.buildingCount * weights.building + inputs.residentCount * weights.resident + inputs.averageResidentHappiness * weights.happiness;
}

export class DailyLeaderboardRegistry {
  private snapshots = new Map<string, DailyLeaderboardSnapshot>();

  recomputeForDay(dateKey: string, allCityScores: CityScoreInputs[]): DailyLeaderboardSnapshot {
    const ranked = allCityScores
      .map((inputs) => ({ cityId: inputs.cityId, score: computeCityScore(inputs) }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index): LeaderboardEntry => ({ ...entry, rank: index + 1 }));
    const snapshot: DailyLeaderboardSnapshot = { dateKey, entries: ranked };
    this.snapshots.set(dateKey, snapshot);
    return snapshot;
  }

  snapshotFor(dateKey: string): DailyLeaderboardSnapshot | undefined {
    return this.snapshots.get(dateKey);
  }

  /** "Today's top city" — the celebratory highlight, never a shaming bottom-of-list callout. */
  topCityFor(dateKey: string): LeaderboardEntry | undefined {
    return this.snapshotFor(dateKey)?.entries[0];
  }
}
