import { computeCityScore, DailyLeaderboardRegistry } from '../src/modules/leaderboard';

describe('DailyLeaderboardRegistry', () => {
  it('computes a score from buildings, residents, and happiness', () => {
    const score = computeCityScore({ cityId: 'city_1', buildingCount: 2, residentCount: 3, averageResidentHappiness: 80 });
    expect(score).toBe(2 * 10 + 3 * 15 + 80 * 1);
  });

  it('ranks cities by score, highest first', () => {
    const registry = new DailyLeaderboardRegistry();
    const snapshot = registry.recomputeForDay('2026-07-06', [
      { cityId: 'city_low', buildingCount: 1, residentCount: 1, averageResidentHappiness: 50 },
      { cityId: 'city_high', buildingCount: 5, residentCount: 5, averageResidentHappiness: 90 },
    ]);
    expect(snapshot.entries[0].cityId).toBe('city_high');
    expect(snapshot.entries[0].rank).toBe(1);
  });

  it("exposes today's top city", () => {
    const registry = new DailyLeaderboardRegistry();
    registry.recomputeForDay('2026-07-06', [
      { cityId: 'city_a', buildingCount: 1, residentCount: 1, averageResidentHappiness: 50 },
      { cityId: 'city_b', buildingCount: 10, residentCount: 10, averageResidentHappiness: 100 },
    ]);
    expect(registry.topCityFor('2026-07-06')?.cityId).toBe('city_b');
  });

  it('returns undefined for a day with no snapshot yet', () => {
    const registry = new DailyLeaderboardRegistry();
    expect(registry.topCityFor('2099-01-01')).toBeUndefined();
  });
});
