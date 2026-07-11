import { ExpoEntry, StickerEvent, StickerReaction } from '../types/domain';
import { ModerationQueue, ParentalConsentRegistry } from './parentSafety';

/**
 * Safe Internal Expo module ("نمایشگاه شهرهای دوستان").
 *
 * Deliberately NOT a social network: nickname + avatar only, sticker-only
 * reactions, no free chat, no comments, no DMs. An artifact can only be
 * published to the expo once it has cleared parental consent + moderation
 * (same gate as viralOutputs.ts), per Google's building-for-kids guidance
 * on replacing open chat/UGC with pre-approved, moderated interactions.
 */
export class ArtifactNotClearedForExpoError extends Error {
  constructor(artifactId: string) {
    super(`Artifact ${artifactId} cannot be published to the expo without parental consent and moderation approval.`);
    this.name = 'ArtifactNotClearedForExpoError';
  }
}

export class SafeExpoRegistry {
  private entries = new Map<string, ExpoEntry>();
  private stickers = new Map<string, StickerEvent>();
  private sequence = 0;

  constructor(private consents: ParentalConsentRegistry, private moderation: ModerationQueue) {}

  private nextEntryId(): string {
    this.sequence += 1;
    return `expo_${Date.now()}_${this.sequence}`;
  }

  private nextStickerId(): string {
    this.sequence += 1;
    return `sticker_${Date.now()}_${this.sequence}`;
  }

  publish(input: { childId: string; artifactId: string; nickname: string; createdAt?: number }): ExpoEntry {
    if (!this.consents.hasGrantedConsent(input.childId) || !this.moderation.isApproved(input.artifactId)) {
      throw new ArtifactNotClearedForExpoError(input.artifactId);
    }
    const entry: ExpoEntry = {
      id: this.nextEntryId(),
      childId: input.childId,
      artifactId: input.artifactId,
      nickname: input.nickname,
      createdAt: input.createdAt ?? Date.now(),
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  /** The only allowed interaction between children: a sticker reaction (never free text). */
  react(expoEntryId: string, fromChildId: string, reaction: StickerReaction, createdAt: number = Date.now()): StickerEvent {
    if (!this.entries.has(expoEntryId)) {
      throw new Error(`Unknown expo entry id: ${expoEntryId}`);
    }
    const sticker: StickerEvent = { id: this.nextStickerId(), expoEntryId, fromChildId, reaction, createdAt };
    this.stickers.set(sticker.id, sticker);
    return sticker;
  }

  stickersForEntry(expoEntryId: string): StickerEvent[] {
    return [...this.stickers.values()].filter((sticker) => sticker.expoEntryId === expoEntryId);
  }

  allEntries(): ExpoEntry[] {
    return [...this.entries.values()];
  }
}
