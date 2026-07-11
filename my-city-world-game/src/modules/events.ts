import { CityEvent, CityEventKind, LocaleString } from '../types/domain';

/**
 * Events (plan block 5): birthdays, outings, parties, and visits form the
 * "living city" everyday-life log. A child can upload photos, but the raw
 * bytes are never persisted anywhere — only a count is kept, and a
 * generated cartoon scene reference stands in for the memory.
 */
export class CityEventRegistry {
  private events = new Map<string, CityEvent>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `event_${Date.now()}_${this.sequence}`;
  }

  create(cityId: string, kind: CityEventKind, title: LocaleString, occurredAt: number = Date.now()): CityEvent {
    const event: CityEvent = {
      id: this.nextId(),
      cityId,
      kind,
      title,
      uploadedPhotoCount: 0,
      occurredAt,
    };
    this.events.set(event.id, event);
    return event;
  }

  /**
   * Registers that the child uploaded a photo. The caller must never pass
   * or retain the raw image bytes/URL here — only the fact that an upload
   * happened is recorded, per the "no raw photo persistence" safety rule.
   */
  registerPhotoUpload(eventId: string): CityEvent {
    const event = this.getById(eventId);
    event.uploadedPhotoCount += 1;
    return event;
  }

  /** Attaches the generated cartoon scene created from the (discarded) uploaded photo(s). */
  attachCartoonScene(eventId: string, cartoonSceneRef: string): CityEvent {
    const event = this.getById(eventId);
    event.cartoonSceneRef = cartoonSceneRef;
    return event;
  }

  getById(eventId: string): CityEvent {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Unknown city event id: ${eventId}`);
    }
    return event;
  }

  forCity(cityId: string): CityEvent[] {
    return [...this.events.values()]
      .filter((event) => event.cityId === cityId)
      .sort((a, b) => a.occurredAt - b.occurredAt);
  }
}
