import {
  InviteRegistry,
  InviteCodeAlreadyRedeemedError,
  SelfInviteError,
  GroupChallengeRegistry,
  ShareRegistry,
  RecapNotClearedToShareError,
  buildShareableRecapText,
} from '../src/modules/viralShare';
import { ParentalConsentRegistry, ModerationQueue } from '../src/modules/safetyModeration';
import { VideoRecap } from '../src/types/domain';

describe('InviteRegistry', () => {
  it('creates and redeems an invite with a dual reward', () => {
    const invites = new InviteRegistry();
    const invite = invites.createInvite('child_1', { kind: 'studio-item', itemId: 'sparkle-mic', label: 'Sparkle Mic' });

    const result = invites.redeem(invite.code, 'child_2');
    expect(result.inviterReward).toEqual(result.inviteeReward);
    expect(invites.getByCode(invite.code)?.redeemedByParticipantId).toBe('child_2');
  });

  it('rejects redeeming an already-redeemed code', () => {
    const invites = new InviteRegistry();
    const invite = invites.createInvite('child_1', { kind: 'studio-item', itemId: 'x', label: 'X' });
    invites.redeem(invite.code, 'child_2');
    expect(() => invites.redeem(invite.code, 'child_3')).toThrow(InviteCodeAlreadyRedeemedError);
  });

  it('rejects a self-invite redemption', () => {
    const invites = new InviteRegistry();
    const invite = invites.createInvite('child_1', { kind: 'studio-item', itemId: 'x', label: 'X' });
    expect(() => invites.redeem(invite.code, 'child_1')).toThrow(SelfInviteError);
  });
});

describe('GroupChallengeRegistry', () => {
  it('activates once the collective member threshold is reached', () => {
    const challenges = new GroupChallengeRegistry();
    const challenge = challenges.create({ title: 'Class Sing-Along Week', createdByParentOrTeacherId: 'teacher_1', memberThreshold: 2 });

    challenges.join(challenge.id, 'child_1');
    expect(challenges.isActivated(challenge.id)).toBe(false);

    challenges.join(challenge.id, 'child_2');
    expect(challenges.isActivated(challenge.id)).toBe(true);
  });

  it('lists all created challenges', () => {
    const challenges = new GroupChallengeRegistry();
    challenges.create({ title: 'A', createdByParentOrTeacherId: 'teacher_1', memberThreshold: 2 });
    challenges.create({ title: 'B', createdByParentOrTeacherId: 'teacher_1', memberThreshold: 3 });
    expect(challenges.list()).toHaveLength(2);
  });
});

describe('ShareRegistry', () => {
  const recap: VideoRecap = {
    id: 'recap_1',
    sessionId: 'session_1',
    mixOutputId: 'mix_1',
    participantIds: ['child_1', 'child_2'],
    generatedAt: Date.now(),
  };

  it('refuses to auto-share a recap without consent + moderation clearance', () => {
    const shares = new ShareRegistry();
    expect(() => shares.autoShare(recap)).toThrow(RecapNotClearedToShareError);
  });

  it('auto-shares once every participant has consent and moderation approved it', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const shares = new ShareRegistry(consents, moderation);

    consents.grant(consents.request('child_1', 'parent_1').id);
    consents.grant(consents.request('child_2', 'parent_2').id);
    moderation.decide(moderation.enqueue(recap.id).id, 'approved');

    const event = shares.autoShare(recap);
    expect(event.destination).toBe('in-app-feed');
    expect(shares.sharesForRecap(recap.id)).toHaveLength(1);
  });

  it('refuses to share when only some participants have consent', () => {
    const consents = new ParentalConsentRegistry();
    const moderation = new ModerationQueue();
    const shares = new ShareRegistry(consents, moderation);

    consents.grant(consents.request('child_1', 'parent_1').id);
    moderation.decide(moderation.enqueue(recap.id).id, 'approved');

    expect(() => shares.autoShare(recap)).toThrow(RecapNotClearedToShareError);
  });
});

describe('buildShareableRecapText', () => {
  it('builds a friendly, non-competitive share message', () => {
    const text = buildShareableRecapText(['Sara', 'Ali'], 'Super Team Go!');
    expect(text).toContain('Sara, Ali');
    expect(text).toContain('Super Team Go!');
  });
});
