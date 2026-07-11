import { LocaleString, ShareRecord } from '../types/domain';

/**
 * Share Links (plan block 9, viral rule): every saved city can produce a
 * public share record at `/mycity/share/:id` with per-locale dynamic meta
 * (title/description/thumb). The actual `navigator.share()` (Web Share
 * API) call is a UI-layer concern; this module only owns the data
 * contract the UI needs to call it with.
 */
export class ShareRegistry {
  private records = new Map<string, ShareRecord>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `share_${Date.now()}_${this.sequence}`;
  }

  createShareLink(cityId: string, title: LocaleString, description: LocaleString, thumbRef: string, createdAt: number = Date.now()): ShareRecord {
    const id = this.nextId();
    const record: ShareRecord = {
      id,
      cityId,
      slugPath: `/mycity/share/${id}`,
      title,
      description,
      thumbRef,
      createdAt,
    };
    this.records.set(id, record);
    return record;
  }

  getById(id: string): ShareRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Unknown share record id: ${id}`);
    }
    return record;
  }

  forCity(cityId: string): ShareRecord[] {
    return [...this.records.values()].filter((record) => record.cityId === cityId);
  }

  /** The data contract a UI layer would pass to `navigator.share()`. */
  toWebShareData(id: string, locale: keyof LocaleString): { title: string; text: string; url: string } {
    const record = this.getById(id);
    return {
      title: record.title[locale],
      text: record.description[locale],
      url: record.slugPath,
    };
  }
}
