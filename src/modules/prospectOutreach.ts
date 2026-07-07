import {
  ApprovalRecord,
  InPersonVisit,
  OnlineSessionInvite,
  OutreachPlatform,
  Prospect,
  ProspectStatus,
  ReferenceCheckRecord,
} from '../types/domain';

/**
 * Prospect outreach pipeline module.
 *
 * Implements the requested flow: search for accounts on a social/professional
 * network (or banking portal) that match a recruitment plan, auto-qualify
 * anyone scoring 80% or above, contact them first inside their own platform,
 * convert the account into an email/phone, contact them directly, invite
 * them to an online consultation using a combined default+custom script,
 * then invite them in person to the salon/office within a controlled time
 * window, hand the resulting list to a responsible person for approval, and
 * finally send the contract once approved.
 *
 * A fully independent module: it references a `RecruitmentPlan.id` and an
 * optional `AudienceProfile.id` by string only, so it does not import from
 * (or get imported by) `freelancerRecruitment.ts` or
 * `presentationCampaigns.ts`.
 */

/** Any match score at or above this threshold is automatically qualified for active outreach. */
export const QUALIFY_THRESHOLD = 80;

/** Default salon/office visiting hours used to keep in-person invites within a controlled time window. */
export const DEFAULT_VISIT_WINDOW = { openHour: 8, closeHour: 21 };

function assertScore(value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`"matchScore" must be a number between 0 and 100, got ${value}.`);
  }
}

export class ProspectNotFoundError extends Error {
  constructor(id: string) {
    super(`Prospect "${id}" not found.`);
    this.name = 'ProspectNotFoundError';
  }
}

export class InvalidProspectStatusError extends Error {
  constructor(id: string, actual: ProspectStatus, expected: ProspectStatus[]) {
    super(`Prospect "${id}" is in status "${actual}", expected one of: ${expected.join(', ')}.`);
    this.name = 'InvalidProspectStatusError';
  }
}

/**
 * Stores the base ("your own") script plus any manually-added custom
 * segments per key (e.g. an audience profile id or platform), and combines
 * them for use on an online-consultation call, matching the requirement of
 * "طبق اسکریپت خودت و اسکریپتی که ما بهش اضافه میکنیم".
 */
export class OutreachScriptRegistry {
  private base = new Map<string, string>();
  private customSegments = new Map<string, string[]>();

  setBaseScript(key: string, text: string): void {
    if (!text.trim()) throw new Error('"text" is required.');
    this.base.set(key, text);
  }

  addCustomSegment(key: string, text: string): void {
    if (!text.trim()) throw new Error('"text" is required.');
    const existing = this.customSegments.get(key) ?? [];
    existing.push(text);
    this.customSegments.set(key, existing);
  }

  getCustomSegments(key: string): string[] {
    return [...(this.customSegments.get(key) ?? [])];
  }

  /** Combines the default script with every custom segment added for this key, in order. */
  getCombinedScript(key: string, fallback = 'Hi {{firstName}}, thanks for connecting - let us schedule a quick call.'): string {
    const parts = [this.base.get(key) ?? fallback, ...(this.customSegments.get(key) ?? [])];
    return parts.join('\n\n');
  }
}

let prospectIdSeq = 0;
function nextProspectId(): string {
  prospectIdSeq += 1;
  return `prospect_${Date.now()}_${prospectIdSeq}`;
}

/**
 * Registry of prospects sourced while searching a network for accounts
 * matching a recruitment plan, driven through the full outreach state
 * machine to a signed contract.
 */
export class OutreachProspectRegistry {
  private prospects = new Map<string, Prospect>();

  /** Records an account found while searching a network for matches against a plan. */
  add(params: {
    id?: string;
    planId: string;
    audienceProfileId?: string;
    platform: OutreachPlatform;
    accountHandle: string;
    displayName?: string;
    matchScore: number;
    notes?: string;
    now?: number;
  }): Prospect {
    if (!params.planId.trim()) throw new Error('"planId" is required.');
    if (!params.accountHandle.trim()) throw new Error('"accountHandle" is required.');
    assertScore(params.matchScore);

    const id = params.id ?? nextProspectId();
    if (this.prospects.has(id)) {
      throw new Error(`A prospect with id "${id}" already exists.`);
    }

    const prospect: Prospect = {
      id,
      planId: params.planId,
      audienceProfileId: params.audienceProfileId,
      platform: params.platform,
      accountHandle: params.accountHandle.trim(),
      displayName: params.displayName,
      matchScore: params.matchScore,
      status: 'sourced',
      notes: params.notes,
      createdAt: params.now ?? Date.now(),
    };
    this.prospects.set(id, prospect);
    return prospect;
  }

  get(id: string): Prospect | undefined {
    return this.prospects.get(id);
  }

  private mustGet(id: string): Prospect {
    const prospect = this.prospects.get(id);
    if (!prospect) throw new ProspectNotFoundError(id);
    return prospect;
  }

  private assertStatus(prospect: Prospect, expected: ProspectStatus[]): void {
    if (!expected.includes(prospect.status)) {
      throw new InvalidProspectStatusError(prospect.id, prospect.status, expected);
    }
  }

  /** Auto-qualifies (or drops) a sourced prospect based on the 80%-and-above match threshold. */
  qualify(id: string): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['sourced']);
    prospect.status = prospect.matchScore >= QUALIFY_THRESHOLD ? 'qualified' : 'disqualified';
    return prospect;
  }

  /** Contacts a qualified prospect inside their own platform (e.g. an Instagram/LinkedIn DM). */
  recordPlatformOutreach(id: string, message: string): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['qualified']);
    if (!message.trim()) throw new Error('"message" is required.');
    prospect.platformMessage = message;
    prospect.status = 'platform-contacted';
    return prospect;
  }

  /** Converts the platform account into an email/phone contact - the requested "تبدیل اکانت به ایمیل و تلفن". */
  convertToContact(id: string, params: { email?: string; phone?: string }): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['platform-contacted']);
    if (!params.email && !params.phone) {
      throw new Error('At least one of "email" or "phone" is required to convert the account.');
    }
    prospect.email = params.email;
    prospect.phone = params.phone;
    prospect.status = 'contact-converted';
    return prospect;
  }

  /** Contacts the prospect directly through the newly-converted email/phone channel. */
  recordDirectOutreach(id: string, channel: 'email' | 'phone', message: string): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['contact-converted']);
    if (channel === 'email' && !prospect.email) {
      throw new Error(`Prospect "${id}" has no email on file to contact by email.`);
    }
    if (channel === 'phone' && !prospect.phone) {
      throw new Error(`Prospect "${id}" has no phone on file to contact by phone.`);
    }
    if (!message.trim()) throw new Error('"message" is required.');
    prospect.directOutreachChannel = channel;
    prospect.directOutreachMessage = message;
    prospect.status = 'direct-contacted';
    return prospect;
  }

  /** Invites the prospect to an online consultation, using the combined default+custom script. */
  inviteOnlineSession(id: string, params: { scheduledAt: number; script: string }): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['direct-contacted', 'online-no-show']);
    if (!params.script.trim()) throw new Error('"script" is required.');
    const onlineSession: OnlineSessionInvite = { scheduledAt: params.scheduledAt, script: params.script };
    prospect.onlineSession = onlineSession;
    prospect.status = 'online-invited';
    return prospect;
  }

  recordOnlineSessionOutcome(id: string, outcome: 'completed' | 'no-show'): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['online-invited']);
    if (!prospect.onlineSession) throw new Error(`Prospect "${id}" has no online session invite on file.`);
    prospect.onlineSession.outcome = outcome;
    prospect.status = outcome === 'completed' ? 'online-completed' : 'online-no-show';
    return prospect;
  }

  /** Invites the prospect to the salon/office in person, with the time slot controlled to the visiting-hours window. */
  inviteInPerson(
    id: string,
    params: {
      locationId: string;
      scheduledAt: number;
      durationMinutes?: number;
      openHour?: number;
      closeHour?: number;
    }
  ): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['online-completed', 'in-person-no-show']);
    if (!params.locationId.trim()) throw new Error('"locationId" is required.');

    const openHour = params.openHour ?? DEFAULT_VISIT_WINDOW.openHour;
    const closeHour = params.closeHour ?? DEFAULT_VISIT_WINDOW.closeHour;
    const hour = new Date(params.scheduledAt).getHours();
    if (hour < openHour || hour >= closeHour) {
      throw new Error(
        `"scheduledAt" hour ${hour}:00 is outside the controlled visiting window (${openHour}:00-${closeHour}:00).`
      );
    }

    const inPersonVisit: InPersonVisit = {
      locationId: params.locationId,
      scheduledAt: params.scheduledAt,
      durationMinutes: params.durationMinutes ?? 30,
    };
    prospect.inPersonVisit = inPersonVisit;
    prospect.status = 'in-person-invited';
    return prospect;
  }

  recordInPersonOutcome(id: string, outcome: 'completed' | 'no-show'): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['in-person-invited']);
    if (!prospect.inPersonVisit) throw new Error(`Prospect "${id}" has no in-person visit on file.`);
    prospect.inPersonVisit.outcome = outcome;
    prospect.status = outcome === 'completed' ? 'in-person-completed' : 'in-person-no-show';
    return prospect;
  }

  /** Hands the completed prospect over to the responsible person for a hire/collaborate approval before a contract is sent. */
  submitForApproval(id: string, responsibleContact: string, now: number = Date.now()): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['in-person-completed']);
    if (!responsibleContact.trim()) throw new Error('"responsibleContact" is required.');
    const approval: ApprovalRecord = { responsibleContact, submittedAt: now };
    prospect.approval = approval;
    prospect.status = 'pending-approval';
    return prospect;
  }

  decideApproval(id: string, decision: 'approved' | 'rejected', decidedBy: string, now: number = Date.now()): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['pending-approval']);
    if (!prospect.approval) throw new Error(`Prospect "${id}" has no pending approval on file.`);
    prospect.approval.decision = decision;
    prospect.approval.decidedBy = decidedBy;
    prospect.approval.decidedAt = now;
    prospect.status = decision;
    return prospect;
  }

  /**
   * Records the mandatory pre-hire reference check - that the candidate's
   * previous employer/workplace was contacted - required before a contract
   * can be sent. Allowed once the prospect has been approved.
   */
  recordReferenceCheck(
    id: string,
    params: { contactedPreviousEmployer: boolean; confirmedBy?: string; notes?: string },
    now: number = Date.now()
  ): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['approved']);
    const referenceCheck: ReferenceCheckRecord = {
      contactedPreviousEmployer: params.contactedPreviousEmployer,
      confirmedAt: now,
      confirmedBy: params.confirmedBy,
      notes: params.notes,
    };
    prospect.referenceCheck = referenceCheck;
    return prospect;
  }

  /**
   * Marks the contract as sent once the responsible person has approved the
   * prospect and the mandatory previous-employer reference check has been
   * recorded and confirmed - a contract can never be sent without it.
   */
  markContractSent(id: string): Prospect {
    const prospect = this.mustGet(id);
    this.assertStatus(prospect, ['approved']);
    if (!prospect.referenceCheck || !prospect.referenceCheck.contactedPreviousEmployer) {
      throw new Error(
        `Prospect "${id}" cannot have a contract sent until the previous employer has been contacted and the reference check recorded.`
      );
    }
    prospect.status = 'contract-sent';
    return prospect;
  }

  /** The list handed to the responsible person: every prospect currently awaiting their approval. */
  listPendingApproval(): Prospect[] {
    return [...this.prospects.values()].filter((p) => p.status === 'pending-approval');
  }

  listByStatus(status: ProspectStatus): Prospect[] {
    return [...this.prospects.values()].filter((p) => p.status === status);
  }

  listByPlan(planId: string): Prospect[] {
    return [...this.prospects.values()].filter((p) => p.planId === planId);
  }

  all(): Prospect[] {
    return [...this.prospects.values()];
  }
}

/** Generates the contract-offer text sent once a prospect has been approved by the responsible person. */
export function generateProspectContractPacket(prospect: Prospect): string {
  return [
    `Collaboration Contract - ${prospect.displayName ?? prospect.accountHandle}`,
    ``,
    `Platform: ${prospect.platform} (${prospect.accountHandle})`,
    `Contact: ${prospect.email ?? ''} ${prospect.phone ?? ''}`.trim(),
    `Match score: ${prospect.matchScore}%`,
    ``,
    `Please confirm acceptance to finalize the collaboration.`,
  ].join('\n');
}
