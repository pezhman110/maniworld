import { GroupChallenge, InviteCode, InviteReward } from '../types/domain';

/**
 * Viral growth mechanics module.
 *
 * Two loops, both designed around the safety guidance in the plan (no public
 * 1:1 leaderboards between kids, no direct-to-child advertising):
 *  - InviteRegistry: a parent-shareable invite code that rewards BOTH the
 *    inviter and the invitee once redeemed (dual reward), unlocking
 *    2-player mini-games.
 *  - GroupChallengeRegistry: a parent/teacher-created weekly challenge for a
 *    class or family group that "activates" once enough members join
 *    (collective threshold), so the incentive is to invite more members
 *    rather than to outrank a specific child.
 */
export class InviteCodeAlreadyRedeemedError extends Error {
  constructor(code: string) {
    super(`Invite code ${code} was already redeemed.`);
    this.name = 'InviteCodeAlreadyRedeemedError';
  }
}

export class SelfInviteError extends Error {
  constructor() {
    super('A child cannot redeem their own invite code.');
    this.name = 'SelfInviteError';
  }
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class InviteRegistry {
  private codes = new Map<string, InviteCode>();

  createInvite(inviterChildId: string, reward: InviteReward): InviteCode {
    let code = randomCode();
    while (this.codes.has(code)) {
      code = randomCode();
    }
    const invite: InviteCode = { code, inviterChildId, createdAt: Date.now(), reward };
    this.codes.set(code, invite);
    return invite;
  }

  /** Redeems an invite, granting the same reward to both inviter and invitee. */
  redeem(code: string, inviteeChildId: string): { inviterReward: InviteReward; inviteeReward: InviteReward } {
    const invite = this.codes.get(code);
    if (!invite) {
      throw new Error(`Unknown invite code: ${code}`);
    }
    if (invite.redeemedByChildId) {
      throw new InviteCodeAlreadyRedeemedError(code);
    }
    if (invite.inviterChildId === inviteeChildId) {
      throw new SelfInviteError();
    }

    invite.redeemedByChildId = inviteeChildId;
    invite.redeemedAt = Date.now();

    return { inviterReward: invite.reward, inviteeReward: invite.reward };
  }

  getByCode(code: string): InviteCode | undefined {
    return this.codes.get(code);
  }

  invitesByChild(inviterChildId: string): InviteCode[] {
    return [...this.codes.values()].filter((invite) => invite.inviterChildId === inviterChildId);
  }
}

export class GroupChallengeRegistry {
  private challenges = new Map<string, GroupChallenge>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `challenge_${Date.now()}_${this.sequence}`;
  }

  create(input: {
    title: string;
    skillId: string;
    createdByParentOrTeacherId: string;
    memberThreshold: number;
  }): GroupChallenge {
    const challenge: GroupChallenge = {
      id: this.nextId(),
      title: input.title,
      skillId: input.skillId,
      createdByParentOrTeacherId: input.createdByParentOrTeacherId,
      memberThreshold: input.memberThreshold,
      memberChildIds: [],
      createdAt: Date.now(),
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  /** Adds a member; if the collective threshold is now met, activates the challenge. */
  join(challengeId: string, childId: string): GroupChallenge {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Unknown group challenge id: ${challengeId}`);
    }
    if (!challenge.memberChildIds.includes(childId)) {
      challenge.memberChildIds.push(childId);
    }
    if (!challenge.activatedAt && challenge.memberChildIds.length >= challenge.memberThreshold) {
      challenge.activatedAt = Date.now();
    }
    return challenge;
  }

  getById(challengeId: string): GroupChallenge | undefined {
    return this.challenges.get(challengeId);
  }

  isActivated(challengeId: string): boolean {
    return Boolean(this.getById(challengeId)?.activatedAt);
  }
}

/** Builds the shareable text for a "skill badge card" (parent shares achievement, not competitive rank). */
export function buildShareableBadgeCardText(childDisplayName: string, skillTitle: string, tier: string): string {
  return `${childDisplayName} just earned the ${tier.toUpperCase()} badge for "${skillTitle}"! 🎉`;
}
