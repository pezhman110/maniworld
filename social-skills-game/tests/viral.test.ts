import {
  InviteRegistry,
  GroupChallengeRegistry,
  InviteCodeAlreadyRedeemedError,
  SelfInviteError,
  buildShareableBadgeCardText,
} from '../src/modules/viral';

describe('InviteRegistry', () => {
  it('rewards both inviter and invitee on redemption', () => {
    const registry = new InviteRegistry();
    const reward = { kind: 'avatar-item' as const, itemId: 'hat_rainbow', label: 'Rainbow Hat' };
    const invite = registry.createInvite('child_1', reward);

    const result = registry.redeem(invite.code, 'child_2');
    expect(result.inviterReward).toEqual(reward);
    expect(result.inviteeReward).toEqual(reward);
  });

  it('rejects a second redemption of the same code', () => {
    const registry = new InviteRegistry();
    const invite = registry.createInvite('child_1', { kind: 'avatar-item', itemId: 'x', label: 'X' });
    registry.redeem(invite.code, 'child_2');

    expect(() => registry.redeem(invite.code, 'child_3')).toThrow(InviteCodeAlreadyRedeemedError);
  });

  it('rejects a child redeeming their own invite code', () => {
    const registry = new InviteRegistry();
    const invite = registry.createInvite('child_1', { kind: 'avatar-item', itemId: 'x', label: 'X' });

    expect(() => registry.redeem(invite.code, 'child_1')).toThrow(SelfInviteError);
  });

  it('lists invites created by a child', () => {
    const registry = new InviteRegistry();
    registry.createInvite('child_1', { kind: 'avatar-item', itemId: 'a', label: 'A' });
    registry.createInvite('child_1', { kind: 'avatar-item', itemId: 'b', label: 'B' });
    registry.createInvite('child_2', { kind: 'avatar-item', itemId: 'c', label: 'C' });

    expect(registry.invitesByChild('child_1')).toHaveLength(2);
  });
});

describe('GroupChallengeRegistry', () => {
  it('activates once the member threshold is reached', () => {
    const registry = new GroupChallengeRegistry();
    const challenge = registry.create({
      title: 'Weekly Empathy Challenge',
      skillId: 'simple-empathy',
      createdByParentOrTeacherId: 'teacher_1',
      memberThreshold: 3,
    });

    expect(registry.isActivated(challenge.id)).toBe(false);

    registry.join(challenge.id, 'child_1');
    registry.join(challenge.id, 'child_2');
    expect(registry.isActivated(challenge.id)).toBe(false);

    registry.join(challenge.id, 'child_3');
    expect(registry.isActivated(challenge.id)).toBe(true);
  });

  it('does not add the same child twice', () => {
    const registry = new GroupChallengeRegistry();
    const challenge = registry.create({
      title: 'Test',
      skillId: 'skill-a',
      createdByParentOrTeacherId: 'parent_1',
      memberThreshold: 2,
    });

    registry.join(challenge.id, 'child_1');
    registry.join(challenge.id, 'child_1');

    expect(registry.getById(challenge.id)?.memberChildIds).toEqual(['child_1']);
  });
});

describe('buildShareableBadgeCardText', () => {
  it('builds a friendly non-competitive share message', () => {
    const text = buildShareableBadgeCardText('Sara', 'Saying Hello & Introducing Yourself', 'gold');
    expect(text).toContain('Sara');
    expect(text).toContain('GOLD');
    expect(text).toContain('Saying Hello & Introducing Yourself');
  });
});
