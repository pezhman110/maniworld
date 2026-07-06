import { BirthdayEvent, RegionCode, SeasonalEventId, SeasonalEventRule } from '../types/domain';

/**
 * Special events module: birthday/membership-anniversary celebrations and
 * seasonal/cultural events (Nowruz, Ramadan/Eid, Yalda, UAE National Day),
 * both natural, low-effort moments for parents to want to share.
 */
export class BirthdayEventRegistry {
  private events = new Map<string, BirthdayEvent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `birthday_${Date.now()}_${this.sequence}`;
  }

  celebrate(childId: string, cityId: string, occurredAt: number = Date.now()): BirthdayEvent {
    const event: BirthdayEvent = { id: this.nextId(), childId, cityId, occurredAt };
    this.events.set(event.id, event);
    return event;
  }

  attachArtifact(eventId: string, artifactId: string): BirthdayEvent {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Unknown birthday event id: ${eventId}`);
    }
    event.artifactId = artifactId;
    return event;
  }

  eventsForChild(childId: string): BirthdayEvent[] {
    return [...this.events.values()].filter((event) => event.childId === childId);
  }
}

export const DEFAULT_SEASONAL_EVENT_RULES: SeasonalEventRule[] = [
  { id: 'nowruz', label: 'Nowruz', regions: ['IR'], startMonth: 3, startDay: 20, durationDays: 13 },
  { id: 'ramadan-eid', label: 'Ramadan & Eid', regions: ['IR', 'AE'], startMonth: 3, startDay: 1, durationDays: 30 },
  { id: 'yalda', label: 'Yalda Night', regions: ['IR'], startMonth: 12, startDay: 21, durationDays: 1 },
  { id: 'uae-national-day', label: 'UAE National Day', regions: ['AE'], startMonth: 12, startDay: 2, durationDays: 1 },
];

export class SeasonalEventRegistry {
  private rules: SeasonalEventRule[];

  constructor(rules: SeasonalEventRule[] = DEFAULT_SEASONAL_EVENT_RULES) {
    this.rules = rules;
  }

  rulesForRegion(region: RegionCode): SeasonalEventRule[] {
    return this.rules.filter((rule) => rule.regions.includes(region));
  }

  getById(id: SeasonalEventId): SeasonalEventRule | undefined {
    return this.rules.find((rule) => rule.id === id);
  }

  /** Whether the given month/day falls within an active event window for the region. */
  isActive(region: RegionCode, id: SeasonalEventId, month: number, day: number): boolean {
    const rule = this.rules.find((r) => r.id === id && r.regions.includes(region));
    if (!rule) {
      return false;
    }
    const start = rule.startMonth * 31 + rule.startDay;
    const current = month * 31 + day;
    return current >= start && current < start + rule.durationDays;
  }
}
