import { WeeklyMission, WeeklyMissionDayNumber } from '../types/domain';

/**
 * Weekly City Mission module — the retention/viral spine of the product.
 * Every week follows a fixed 7-day structure (per the plan): city naming &
 * opening, first building, first resource problem, robot planning, family
 * consultation, big team project, closing celebration + honor report.
 */
const DEFAULT_DAY_TITLES: Record<WeeklyMissionDayNumber, string> = {
  1: 'City naming & opening ceremony',
  2: 'Build the first building',
  3: 'Solve the first resource problem',
  4: 'Plan the robot',
  5: 'Consult the family',
  6: 'Big team project',
  7: 'Closing festival & honor report',
};

export class WeeklyMissionRegistry {
  private missions = new Map<string, WeeklyMission>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `mission_${Date.now()}_${this.sequence}`;
  }

  start(input: { childId: string; theme: string; startedAt?: number }): WeeklyMission {
    const mission: WeeklyMission = {
      id: this.nextId(),
      childId: input.childId,
      theme: input.theme,
      days: (Object.keys(DEFAULT_DAY_TITLES) as unknown as WeeklyMissionDayNumber[])
        .map(Number)
        .sort((a, b) => a - b)
        .map((day) => ({ day: day as WeeklyMissionDayNumber, title: DEFAULT_DAY_TITLES[day as WeeklyMissionDayNumber], completed: false })),
      startedAt: input.startedAt ?? Date.now(),
    };
    this.missions.set(mission.id, mission);
    return mission;
  }

  getById(missionId: string): WeeklyMission {
    const mission = this.missions.get(missionId);
    if (!mission) {
      throw new Error(`Unknown weekly mission id: ${missionId}`);
    }
    return mission;
  }

  completeDay(missionId: string, day: WeeklyMissionDayNumber, completedAt: number = Date.now()): WeeklyMission {
    const mission = this.getById(missionId);
    const dayEntry = mission.days.find((entry) => entry.day === day);
    if (!dayEntry) {
      throw new Error(`Day ${day} not found on mission ${missionId}`);
    }
    dayEntry.completed = true;
    dayEntry.completedAt = completedAt;

    if (mission.days.every((entry) => entry.completed) && !mission.completedAt) {
      mission.completedAt = completedAt;
    }
    return mission;
  }

  isComplete(missionId: string): boolean {
    return Boolean(this.getById(missionId).completedAt);
  }

  progress(missionId: string): number {
    const mission = this.getById(missionId);
    const completedCount = mission.days.filter((entry) => entry.completed).length;
    return completedCount / mission.days.length;
  }

  missionsForChild(childId: string): WeeklyMission[] {
    return [...this.missions.values()].filter((mission) => mission.childId === childId);
  }
}
