import { GrowthReport, SkillCategory, SkillEvent } from '../types/domain';

const ALL_SKILL_CATEGORIES: SkillCategory[] = [
  'logical-thinking',
  'problem-solving',
  'decision-making',
  'collaboration',
  'resource-management',
  'creativity',
  'storytelling',
  'kindness',
  'responsibility',
];

/**
 * Growth Map module — turns in-game actions (robot programs written,
 * family votes cast, resource problems solved, kindness missions done)
 * into a parent-facing weekly skill report, so the app reads as
 * educationally valuable, not just entertaining.
 */
export class GrowthMapRegistry {
  private events: SkillEvent[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `skill_event_${Date.now()}_${this.sequence}`;
  }

  record(childId: string, category: SkillCategory, occurredAt: number = Date.now()): SkillEvent {
    const event: SkillEvent = { id: this.nextId(), childId, category, occurredAt };
    this.events.push(event);
    return event;
  }

  eventsForChild(childId: string): SkillEvent[] {
    return this.events.filter((event) => event.childId === childId);
  }

  buildReport(childId: string, periodStart: number, periodEnd: number): GrowthReport {
    const counts = Object.fromEntries(ALL_SKILL_CATEGORIES.map((category) => [category, 0])) as Record<SkillCategory, number>;
    for (const event of this.eventsForChild(childId)) {
      if (event.occurredAt >= periodStart && event.occurredAt <= periodEnd) {
        counts[event.category] += 1;
      }
    }
    return { childId, periodStart, periodEnd, counts };
  }
}
