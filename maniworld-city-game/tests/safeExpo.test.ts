import { ModerationQueue, ParentalConsentRegistry } from '../src/modules/parentSafety';
import { ArtifactNotClearedForExpoError, SafeExpoRegistry } from '../src/modules/safeExpo';

describe('SafeExpoRegistry', () => {
  function setup() {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const expo = new SafeExpoRegistry(consents, moderation);
    return { consents, moderation, expo };
  }

  it('refuses to publish an artifact without consent + moderation', () => {
    const { expo } = setup();
    expect(() => expo.publish({ childId: 'c1', artifactId: 'a1', nickname: 'Nikan' })).toThrow(ArtifactNotClearedForExpoError);
  });

  it('publishes once consent is granted and moderation approves', () => {
    const { consents, moderation, expo } = setup();
    const consent = consents.request('c1', 'p1', 'verified-email');
    consents.grant(consent.id);
    const review = moderation.enqueue('a1');
    moderation.decide(review.id, 'approved');

    const entry = expo.publish({ childId: 'c1', artifactId: 'a1', nickname: 'Nikan' });
    expect(entry.nickname).toBe('Nikan');
  });

  it('only allows sticker reactions between children, never free text', () => {
    const { consents, moderation, expo } = setup();
    const consent = consents.request('c1', 'p1', 'verified-email');
    consents.grant(consent.id);
    const review = moderation.enqueue('a1');
    moderation.decide(review.id, 'approved');
    const entry = expo.publish({ childId: 'c1', artifactId: 'a1', nickname: 'Nikan' });

    const sticker = expo.react(entry.id, 'c2', 'great-robot');
    expect(expo.stickersForEntry(entry.id)).toEqual([sticker]);
  });
});
