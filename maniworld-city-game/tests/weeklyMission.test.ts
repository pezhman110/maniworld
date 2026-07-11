import { WeeklyMissionRegistry } from '../src/modules/weeklyMission';

describe('WeeklyMissionRegistry', () => {
  it('starts a mission with all 7 days incomplete', () => {
    const registry = new WeeklyMissionRegistry();
    const mission = registry.start({ childId: 'c1', theme: 'Green City Week' });
    expect(mission.days).toHaveLength(7);
    expect(mission.days.every((day) => !day.completed)).toBe(true);
  });

  it('tracks progress as days complete', () => {
    const registry = new WeeklyMissionRegistry();
    const mission = registry.start({ childId: 'c1', theme: 'Green City Week' });
    registry.completeDay(mission.id, 1);
    registry.completeDay(mission.id, 2);
    expect(registry.progress(mission.id)).toBeCloseTo(2 / 7);
  });

  it('marks the mission complete once all 7 days are done', () => {
    const registry = new WeeklyMissionRegistry();
    const mission = registry.start({ childId: 'c1', theme: 'Green City Week' });
    for (let day = 1; day <= 7; day += 1) {
      registry.completeDay(mission.id, day as 1 | 2 | 3 | 4 | 5 | 6 | 7);
    }
    expect(registry.isComplete(mission.id)).toBe(true);
  });

  it('throws for an unknown mission', () => {
    const registry = new WeeklyMissionRegistry();
    expect(() => registry.getById('missing')).toThrow();
  });
});
