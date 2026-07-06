import {
  PROMO_VIDEO_DURATION_SECONDS,
  PromoVideo,
  SocialDestination,
  SocialUploadRecord,
} from '../types/domain';
import { CharacterFinalizationRegistry } from './characterFinalization';
import { isClearedToPublish, ModerationQueue, ParentalConsentRegistry } from './parentSafety';

/**
 * Promo video studio module.
 *
 * Once a character is confirmed final (`CharacterFinalizationRegistry` —
 * the child hasn't asked for any change during the whole confirmation
 * window), the studio auto-generates a 30-second promo video for it. The
 * video always overlays the studio name and the character's own name (every
 * character is required to have one, see `characterTraits.ts`), so the clip
 * is self-explanatory even out of context. Real video rendering is an
 * external motion-design service, out of scope here — this module only
 * models the request/status/caption and the gate before it can go out to
 * social media.
 *
 * Publishing follows the same official-API-first + manual-fallback
 * discipline as the main Mani World CRM's `src/modules/socialPublisher.ts`:
 * nothing is ever assumed to have posted successfully, and every upload
 * requires BOTH parental consent AND a passed moderation review first (the
 * same `parentSafety.ts` gate used for marketplace listings and prints).
 */
export class UnknownPromoVideoError extends Error {
  constructor(promoVideoId: string) {
    super(`Unknown promo video id: ${promoVideoId}`);
    this.name = 'UnknownPromoVideoError';
  }
}

export class InvalidPromoVideoTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPromoVideoTransitionError';
  }
}

export class CharacterNotFinalizedError extends Error {
  constructor(characterId: string) {
    super(`Character ${characterId} is not confirmed final yet; the promo video cannot be created.`);
    this.name = 'CharacterNotFinalizedError';
  }
}

export class PromoVideoNotClearedToPostError extends Error {
  constructor(promoVideoId: string) {
    super(`Promo video ${promoVideoId} cannot be posted yet — it needs parental consent and moderation approval.`);
    this.name = 'PromoVideoNotClearedToPostError';
  }
}

/** Builds the on-screen caption/overlay text: always names the studio and the character. */
export function buildOverlayCaption(studioName: string, characterName: string): string {
  return `${studioName} presents: ${characterName}`;
}

export class PromoVideoRegistry {
  private videos = new Map<string, PromoVideo>();
  private uploads = new Map<string, SocialUploadRecord[]>();
  private sequence = 0;

  constructor(private readonly finalizations: CharacterFinalizationRegistry) {}

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${Date.now()}_${this.sequence}`;
  }

  /** Requests a 30-second promo video for a character that has been confirmed final. */
  request(characterId: string, characterName: string, studioName: string, createdAt: number = Date.now()): PromoVideo {
    if (!this.finalizations.isConfirmed(characterId)) {
      throw new CharacterNotFinalizedError(characterId);
    }
    const video: PromoVideo = {
      id: this.nextId('promo'),
      characterId,
      characterName,
      studioName,
      durationSeconds: PROMO_VIDEO_DURATION_SECONDS,
      status: 'pending-generation',
      overlayCaption: buildOverlayCaption(studioName, characterName),
      createdAt,
    };
    this.videos.set(video.id, video);
    return video;
  }

  /** Called once the (external) motion-design service has rendered the clip. */
  markGenerated(promoVideoId: string, videoAssetRef: string): PromoVideo {
    const video = this.getById(promoVideoId);
    if (video.status !== 'pending-generation') {
      throw new InvalidPromoVideoTransitionError(
        `Promo video ${promoVideoId} must be "pending-generation" before it can be marked generated (was "${video.status}").`
      );
    }
    video.status = 'generated';
    video.videoAssetRef = videoAssetRef;
    return video;
  }

  /** Clears a generated video for social upload once consent + moderation both pass. */
  clearForSocial(promoVideoId: string, consents: ParentalConsentRegistry, moderation: ModerationQueue): PromoVideo {
    const video = this.getById(promoVideoId);
    if (video.status !== 'generated') {
      throw new InvalidPromoVideoTransitionError(
        `Promo video ${promoVideoId} must be "generated" before it can be cleared for social (was "${video.status}").`
      );
    }
    if (!isClearedToPublish(video.characterId, 'promo-video', promoVideoId, consents, moderation)) {
      throw new PromoVideoNotClearedToPostError(promoVideoId);
    }
    video.status = 'cleared-for-social';
    return video;
  }

  /** Queues the cleared video for upload to one external social destination. */
  queueForSocial(promoVideoId: string, destination: SocialDestination, queuedAt: number = Date.now()): SocialUploadRecord {
    const video = this.getById(promoVideoId);
    if (video.status !== 'cleared-for-social' && video.status !== 'queued-for-social') {
      throw new InvalidPromoVideoTransitionError(
        `Promo video ${promoVideoId} must be cleared for social before it can be queued (was "${video.status}").`
      );
    }
    video.status = 'queued-for-social';
    const record: SocialUploadRecord = {
      id: this.nextId('upload'),
      promoVideoId,
      destination,
      status: 'queued',
      queuedAt,
    };
    const list = this.uploads.get(promoVideoId) ?? [];
    list.push(record);
    this.uploads.set(promoVideoId, list);
    return record;
  }

  /** Marks a queued upload as successfully posted via the official platform API. */
  markPosted(uploadId: string, promoVideoId: string, postedAt: number = Date.now()): SocialUploadRecord {
    const record = this.getUploadById(uploadId, promoVideoId);
    record.status = 'posted';
    record.postedAt = postedAt;
    const video = this.getById(promoVideoId);
    video.status = 'posted';
    return record;
  }

  /** Marks a queued upload as failed, routing it to the manual-fallback queue instead of failing silently. */
  markFailedManualFallback(uploadId: string, promoVideoId: string, failureReason: string): SocialUploadRecord {
    const record = this.getUploadById(uploadId, promoVideoId);
    record.status = 'failed-manual-fallback';
    record.failureReason = failureReason;
    return record;
  }

  private getUploadById(uploadId: string, promoVideoId: string): SocialUploadRecord {
    const record = (this.uploads.get(promoVideoId) ?? []).find((upload) => upload.id === uploadId);
    if (!record) {
      throw new Error(`Unknown social upload id: ${uploadId} for promo video ${promoVideoId}`);
    }
    return record;
  }

  uploadsFor(promoVideoId: string): SocialUploadRecord[] {
    return this.uploads.get(promoVideoId) ?? [];
  }

  getById(promoVideoId: string): PromoVideo {
    const video = this.videos.get(promoVideoId);
    if (!video) {
      throw new UnknownPromoVideoError(promoVideoId);
    }
    return video;
  }

  videosForCharacter(characterId: string): PromoVideo[] {
    return [...this.videos.values()].filter((video) => video.characterId === characterId);
  }
}
