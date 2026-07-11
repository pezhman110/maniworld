import { GroupChallenge, InviteCode, InviteReward, ShareEvent, VideoRecap } from '../types/domain';
import { ModerationQueue, ParentalConsentRegistry } from './safetyModeration';

/**
 * Viral growth mechanics module.
 *
 * Mirrors the `social-skills-game/src/modules/viral.ts` pattern (dual-reward
 * invites + collective group-challenge thresholds, no 1:1 kid ranking), plus
 * the auto-share step this plan specifically calls for: once a recap video
 * clears parental consent + moderation, it can be auto-posted to the in-app
 * social feed to spark other kids to join.
 */
export class InviteCodeAlreadyRedeemedError extends Error {
  constructor(code: string) {
    super(`Invite code ${code} was already redeemed.`);
    this.name = 'InviteCodeAlreadyRedeemedError';
  }
}

export class SelfInviteError extends Error {
  constructor() {
    super('A participant cannot redeem their own invite code.');
    this.name = 'SelfInviteError';
  }
}

export class RecapNotClearedToShareError extends Error {
  constructor(videoRecapId: string) {
    super(`Recap ${videoRecapId} cannot be shared yet — it needs parental consent and moderation approval for every participant.`);
    this.name = 'RecapNotClearedToShareError';
  }
}

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export class InviteRegistry {
  private codes = new Map<string, InviteCode>();

  createInvite(inviterParticipantId: string, reward: InviteReward): InviteCode {
    let code = randomCode();
    while (this.codes.has(code)) {
      code = randomCode();
    }
    const invite: InviteCode = { code, inviterParticipantId, createdAt: Date.now(), reward };
    this.codes.set(code, invite);
    return invite;
  }

  /** Redeems an invite, granting the same reward to both inviter and invitee. */
  redeem(code: string, inviteeParticipantId: string): { inviterReward: InviteReward; inviteeReward: InviteReward } {
    const invite = this.codes.get(code);
    if (!invite) {
      throw new Error(`Unknown invite code: ${code}`);
    }
    if (invite.redeemedByParticipantId) {
      throw new InviteCodeAlreadyRedeemedError(code);
    }
    if (invite.inviterParticipantId === inviteeParticipantId) {
      throw new SelfInviteError();
    }

    invite.redeemedByParticipantId = inviteeParticipantId;
    invite.redeemedAt = Date.now();

    return { inviterReward: invite.reward, inviteeReward: invite.reward };
  }

  getByCode(code: string): InviteCode | undefined {
    return this.codes.get(code);
  }

  invitesByParticipant(inviterParticipantId: string): InviteCode[] {
    return [...this.codes.values()].filter((invite) => invite.inviterParticipantId === inviterParticipantId);
  }
}

export class GroupChallengeRegistry {
  private challenges = new Map<string, GroupChallenge>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `challenge_${Date.now()}_${this.sequence}`;
  }

  create(input: { title: string; createdByParentOrTeacherId: string; memberThreshold: number }): GroupChallenge {
    const challenge: GroupChallenge = {
      id: this.nextId(),
      title: input.title,
      createdByParentOrTeacherId: input.createdByParentOrTeacherId,
      memberThreshold: input.memberThreshold,
      memberParticipantIds: [],
      createdAt: Date.now(),
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  join(challengeId: string, participantId: string): GroupChallenge {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new Error(`Unknown group challenge id: ${challengeId}`);
    }
    if (!challenge.memberParticipantIds.includes(participantId)) {
      challenge.memberParticipantIds.push(participantId);
    }
    if (!challenge.activatedAt && challenge.memberParticipantIds.length >= challenge.memberThreshold) {
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

  list(): GroupChallenge[] {
    return [...this.challenges.values()];
  }
}

export class ShareRegistry {
  private events = new Map<string, ShareEvent>();
  private sequence = 0;

  constructor(
    private consents: ParentalConsentRegistry = new ParentalConsentRegistry(),
    private moderation: ModerationQueue = new ModerationQueue()
  ) {}

  private nextId(): string {
    this.sequence += 1;
    return `share_${Date.now()}_${this.sequence}`;
  }

  /**
   * Auto-shares a cleared recap to the in-app social feed so other kids see
   * it and are nudged to join. Requires granted parental consent for every
   * participant in the recap AND a passed moderation review — otherwise it
   * refuses to post.
   */
  autoShare(
    recap: VideoRecap,
    destination: ShareEvent['destination'] = 'in-app-feed',
    sharedAt: number = Date.now()
  ): ShareEvent {
    const everyoneConsented = recap.participantIds.every((participantId) =>
      this.consents.hasGrantedConsent(participantId)
    );
    if (!everyoneConsented || !this.moderation.isApproved(recap.id)) {
      throw new RecapNotClearedToShareError(recap.id);
    }

    const event: ShareEvent = { id: this.nextId(), videoRecapId: recap.id, sharedAt, destination };
    this.events.set(event.id, event);
    return event;
  }

  sharesForRecap(videoRecapId: string): ShareEvent[] {
    return [...this.events.values()].filter((event) => event.videoRecapId === videoRecapId);
  }
}

/** Builds the shareable text for an achievement card (parent shares, no competitive rank). */
export function buildShareableRecapText(participantDisplayNames: string[], songTitle: string): string {
  const names = participantDisplayNames.join(', ');
  return `${names} just finished making "${songTitle}"! 🎶 Come make one too!`;
}
