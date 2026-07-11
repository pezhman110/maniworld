import { ModerationQueue, ParentalConsentRegistry } from '../src/modules/parentSafety';
import {
  ArtifactNotClearedToShareError,
  buildNewsReportCaption,
  buildPrideCardCaption,
  MediaArtifactRegistry,
  ReferralRegistry,
  SelfInviteError,
} from '../src/modules/viralOutputs';

describe('MediaArtifactRegistry', () => {
  it('creates artifacts of every viral output type', () => {
    const registry = new MediaArtifactRegistry();
    const artifact = registry.create({ childId: 'c1', type: 'micro-trailer', mediaRef: 'ref', caption: 'caption' });
    expect(artifact.type).toBe('micro-trailer');
  });

  it('refuses parent download until consent + moderation clear', () => {
    const registry = new MediaArtifactRegistry();
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const artifact = registry.create({ childId: 'c1', type: 'highlight-video', mediaRef: 'ref', caption: 'caption' });

    expect(() => registry.prepareForParentDownload(artifact.id, consents, moderation)).toThrow(ArtifactNotClearedToShareError);
  });

  it('allows parent download once cleared', () => {
    const registry = new MediaArtifactRegistry();
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const artifact = registry.create({ childId: 'c1', type: 'highlight-video', mediaRef: 'ref', caption: 'caption' });

    const consent = consents.request('c1', 'p1', 'verified-email');
    consents.grant(consent.id);
    const review = moderation.enqueue(artifact.id);
    moderation.decide(review.id, 'approved');

    expect(registry.prepareForParentDownload(artifact.id, consents, moderation)).toBe(artifact);
  });
});

describe('caption builders', () => {
  it('builds a pride card caption', () => {
    expect(buildPrideCardCaption('Nikan', ['built a library', 'programmed a robot'])).toContain('Nikan');
  });

  it('builds a news report caption', () => {
    expect(buildNewsReportCaption('Sunshine City', 'The park bloomed!')).toContain('Sunshine City');
  });
});

describe('ReferralRegistry', () => {
  it('grants a shared friendship badge (not a monetary reward) on redemption', () => {
    const registry = new ReferralRegistry();
    const invite = registry.createInvite('c1');
    const badge = registry.redeem(invite.code, 'c2');
    expect(badge.childAId).toBe('c1');
    expect(badge.childBId).toBe('c2');
    expect(registry.badgesForChild('c1')).toEqual([badge]);
    expect(registry.badgesForChild('c2')).toEqual([badge]);
  });

  it('rejects self-invites', () => {
    const registry = new ReferralRegistry();
    const invite = registry.createInvite('c1');
    expect(() => registry.redeem(invite.code, 'c1')).toThrow(SelfInviteError);
  });
});
