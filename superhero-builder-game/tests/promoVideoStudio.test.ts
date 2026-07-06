import { CharacterFinalizationRegistry } from '../src/modules/characterFinalization';
import { ModerationQueue, ParentalConsentRegistry } from '../src/modules/parentSafety';
import {
  buildOverlayCaption,
  CharacterNotFinalizedError,
  InvalidPromoVideoTransitionError,
  PromoVideoNotClearedToPostError,
  PromoVideoRegistry,
} from '../src/modules/promoVideoStudio';
import { PROMO_VIDEO_DURATION_SECONDS } from '../src/types/domain';

function finalizedCharacter(finalizations: CharacterFinalizationRegistry, characterId: string) {
  finalizations.close(characterId, 0);
  finalizations.confirm(characterId, 2 * 24 * 60 * 60 * 1000);
}

describe('PromoVideoRegistry', () => {
  it('refuses to request a promo video before the character is confirmed final', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);

    expect(() => promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio')).toThrow(
      CharacterNotFinalizedError
    );
  });

  it('builds a 30-second video with a studio+character name overlay once finalized', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);
    finalizedCharacter(finalizations, 'character_1');

    const video = promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio');
    expect(video.durationSeconds).toBe(PROMO_VIDEO_DURATION_SECONDS);
    expect(video.status).toBe('pending-generation');
    expect(video.overlayCaption).toBe(buildOverlayCaption('Mani World Studio', 'Silver Fox'));
    expect(video.overlayCaption).toBe('Mani World Studio presents: Silver Fox');
  });

  it('walks generated -> cleared-for-social only once consent + moderation both pass', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);
    finalizedCharacter(finalizations, 'character_1');
    const video = promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio');
    promoVideos.markGenerated(video.id, 'asset://video-1');

    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    expect(() => promoVideos.clearForSocial(video.id, consents, moderation)).toThrow(PromoVideoNotClearedToPostError);

    const consent = consents.request('character_1', 'parent_1');
    consents.grant(consent.id);
    const review = moderation.enqueue('promo-video', video.id);
    moderation.decide(review.id, 'approved');

    const cleared = promoVideos.clearForSocial(video.id, consents, moderation);
    expect(cleared.status).toBe('cleared-for-social');
  });

  it('rejects clearing a video that has not been generated yet', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);
    finalizedCharacter(finalizations, 'character_1');
    const video = promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio');

    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    expect(() => promoVideos.clearForSocial(video.id, consents, moderation)).toThrow(InvalidPromoVideoTransitionError);
  });

  it('queues a cleared video for social upload and tracks post/failure per destination', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);
    finalizedCharacter(finalizations, 'character_1');
    const video = promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio');
    promoVideos.markGenerated(video.id, 'asset://video-1');

    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('character_1', 'parent_1');
    consents.grant(consent.id);
    const review = moderation.enqueue('promo-video', video.id);
    moderation.decide(review.id, 'approved');
    promoVideos.clearForSocial(video.id, consents, moderation);

    const upload = promoVideos.queueForSocial(video.id, 'instagram');
    expect(upload.status).toBe('queued');
    expect(promoVideos.getById(video.id).status).toBe('queued-for-social');

    const posted = promoVideos.markPosted(upload.id, video.id);
    expect(posted.status).toBe('posted');
    expect(promoVideos.getById(video.id).status).toBe('posted');
  });

  it('routes a failed upload to the manual-fallback status instead of failing silently', () => {
    const finalizations = new CharacterFinalizationRegistry();
    const promoVideos = new PromoVideoRegistry(finalizations);
    finalizedCharacter(finalizations, 'character_1');
    const video = promoVideos.request('character_1', 'Silver Fox', 'Mani World Studio');
    promoVideos.markGenerated(video.id, 'asset://video-1');

    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const consent = consents.request('character_1', 'parent_1');
    consents.grant(consent.id);
    const review = moderation.enqueue('promo-video', video.id);
    moderation.decide(review.id, 'approved');
    promoVideos.clearForSocial(video.id, consents, moderation);

    const upload = promoVideos.queueForSocial(video.id, 'tiktok');
    const failed = promoVideos.markFailedManualFallback(upload.id, video.id, 'API rate limited');
    expect(failed.status).toBe('failed-manual-fallback');
    expect(failed.failureReason).toBe('API rate limited');
    expect(promoVideos.uploadsFor(video.id)).toHaveLength(1);
  });
});
