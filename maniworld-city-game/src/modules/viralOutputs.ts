import { FriendshipBadge, InviteCode, MediaArtifact, MediaArtifactType } from '../types/domain';
import { isClearedToShare, ModerationQueue, ParentalConsentRegistry } from './parentSafety';

/**
 * Viral outputs module: multi-format shareable artifacts (highlight video,
 * micro-trailer, parent pride card, cartoon news report, storybook) plus
 * the Referral Reward Loop (dual "friendship badge", not a monetary/ad
 * reward, per plan). Nothing here posts directly to any external social
 * network — it only prepares artifacts for the parent to download/share
 * themselves, and every artifact must clear consent + moderation first.
 */
export class ArtifactNotClearedToShareError extends Error {
  constructor(artifactId: string) {
    super(`Artifact ${artifactId} cannot be shared yet — it needs parental consent and moderation approval.`);
    this.name = 'ArtifactNotClearedToShareError';
  }
}

export class MediaArtifactRegistry {
  private artifacts = new Map<string, MediaArtifact>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `artifact_${Date.now()}_${this.sequence}`;
  }

  create(input: { childId: string; type: MediaArtifactType; mediaRef: string; caption: string; createdAt?: number }): MediaArtifact {
    const artifact: MediaArtifact = {
      id: this.nextId(),
      childId: input.childId,
      type: input.type,
      mediaRef: input.mediaRef,
      caption: input.caption,
      createdAt: input.createdAt ?? Date.now(),
    };
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  getById(artifactId: string): MediaArtifact {
    const artifact = this.artifacts.get(artifactId);
    if (!artifact) {
      throw new Error(`Unknown media artifact id: ${artifactId}`);
    }
    return artifact;
  }

  artifactsForChild(childId: string): MediaArtifact[] {
    return [...this.artifacts.values()].filter((artifact) => artifact.childId === childId);
  }

  /** Returns the artifact only if it is cleared for the parent to download/share; otherwise throws. */
  prepareForParentDownload(artifactId: string, consents: ParentalConsentRegistry, moderation: ModerationQueue): MediaArtifact {
    const artifact = this.getById(artifactId);
    if (!isClearedToShare(artifact.childId, artifact.id, consents, moderation)) {
      throw new ArtifactNotClearedToShareError(artifactId);
    }
    return artifact;
  }
}

/** Builds a bilingual-ready caption template for a Parent Pride Card. */
export function buildPrideCardCaption(childNickname: string, weeklyHighlights: string[]): string {
  const highlightsText = weeklyHighlights.join(' • ');
  return `${childNickname}'s ManiWorld week: ${highlightsText} 🏙️✨`;
}

/** Builds a short cartoon-news caption for a ManiWorld News artifact. */
export function buildNewsReportCaption(cityName: string, headline: string): string {
  return `Breaking news from ${cityName}! ${headline}`;
}

// ---------------------------------------------------------------------------
// Referral Reward Loop
// ---------------------------------------------------------------------------

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

export class ReferralRegistry {
  private codes = new Map<string, InviteCode>();
  private badges: FriendshipBadge[] = [];
  private sequence = 0;

  private nextBadgeId(): string {
    this.sequence += 1;
    return `badge_${Date.now()}_${this.sequence}`;
  }

  createInvite(inviterChildId: string): InviteCode {
    let code = randomCode();
    while (this.codes.has(code)) {
      code = randomCode();
    }
    const invite: InviteCode = { code, inviterChildId, createdAt: Date.now() };
    this.codes.set(code, invite);
    return invite;
  }

  /**
   * Redeeming an invite grants BOTH children a shared "friendship badge" —
   * not a monetary or ad-based reward — keeping the loop safe and
   * non-commercial while still rewarding growth.
   */
  redeem(code: string, inviteeChildId: string, grantedAt: number = Date.now()): FriendshipBadge {
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
    invite.redeemedAt = grantedAt;

    const badge: FriendshipBadge = {
      id: this.nextBadgeId(),
      childAId: invite.inviterChildId,
      childBId: inviteeChildId,
      grantedAt,
    };
    this.badges.push(badge);
    return badge;
  }

  getByCode(code: string): InviteCode | undefined {
    return this.codes.get(code);
  }

  badgesForChild(childId: string): FriendshipBadge[] {
    return this.badges.filter((badge) => badge.childAId === childId || badge.childBId === childId);
  }
}
