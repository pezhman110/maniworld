import {
  InstagramConsentRecord,
  InstagramContactKind,
  InstagramContactSource,
  InstagramEligibilityDecision,
  InstagramFunnelMetrics,
  InstagramGrowthAccount,
  InstagramGrowthAccountType,
  InstagramGrowthEvent,
  InstagramGrowthStage,
  InstagramPublicSignals,
  InstagramSellerAction,
  InstagramSellerHandoff,
  InstagramWarmupPath,
  SellerHandoffMethod,
} from '../types/domain';

/**
 * Instagram Legal Growth Engine.
 *
 * A consent-first state machine for turning discovered Instagram accounts into
 * lawful warm-up, permission messaging, contact conversion, booking, archive,
 * or strictly manual seller handoff records. It never guesses contact details,
 * never creates fake-account or automated seller tasks, and blocks all future
 * outreach after opt-out.
 */

const ENGAGED_STAGES = new Set<InstagramGrowthStage>([
  'comment-triggered',
  'story-replied',
  'dm-keyword-received',
  'mention-triggered',
  'replied',
  'consented',
  'converted-contact',
  'booking-ready',
]);

const PROHIBITED_SOURCE_TEXT = ['guess', 'scrape', 'scraping', 'purchased', 'bought', 'fake'];

const WARMUP_STAGE_BY_PATH: Partial<Record<InstagramWarmupPath, InstagramGrowthStage>> = {
  retargeting_ad: 'ad-retargeting',
  click_to_dm_ad: 'ad-retargeting',
  comment_keyword: 'comment-triggered',
  story_reply: 'story-replied',
  dm_keyword: 'dm-keyword-received',
  mention_trigger: 'mention-triggered',
};

let accountSeq = 0;
let handoffSeq = 0;

function nextAccountId(): string {
  accountSeq += 1;
  return `ig_account_${Date.now()}_${accountSeq}`;
}

function nextHandoffId(): string {
  handoffSeq += 1;
  return `ig_handoff_${Date.now()}_${handoffSeq}`;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value.trim();
}

function requirePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`"${field}" must be a positive integer.`);
  return value;
}

function normalizeHandle(handle: string): string {
  const normalized = requireNonEmpty(handle, 'handle').replace(/^@+/, '').trim();
  if (!normalized) throw new Error('"handle" is required.');
  return normalized;
}

function sourceLooksProhibited(value: string): boolean {
  const lower = value.toLowerCase();
  return PROHIBITED_SOURCE_TEXT.some((term) => lower.includes(term));
}

function isBusinessLike(type: InstagramGrowthAccountType): boolean {
  return type === 'business' || type === 'creator' || type === 'company' || type === 'influencer';
}

function hasGrantedConsent(account: InstagramGrowthAccount): boolean {
  return account.consent.some((record) => record.state === 'granted');
}

function hasOptedOut(account: InstagramGrowthAccount): boolean {
  return account.stage === 'opted-out' || account.consent.some((record) => record.state === 'opted-out');
}

function hasPublicBusinessContact(account: InstagramGrowthAccount): boolean {
  return account.contacts.some((contact) => contact.publicBusinessContact && Boolean(contact.proof));
}

function hasEngagement(account: InstagramGrowthAccount): boolean {
  return account.warmupPaths.some((path) =>
    ['click_to_dm_ad', 'comment_keyword', 'story_reply', 'dm_keyword', 'mention_trigger', 'lead_form', 'bio_link'].includes(path)
  ) || ENGAGED_STAGES.has(account.stage);
}

function event(stage: InstagramGrowthStage, note: string, actor: string, timestamp: number): InstagramGrowthEvent {
  return { stage, note, actor, timestamp };
}

export class InstagramGrowthAccountNotFoundError extends Error {
  constructor(id: string) {
    super(`Instagram growth account "${id}" not found.`);
    this.name = 'InstagramGrowthAccountNotFoundError';
  }
}

export class InstagramLegalGrowthRegistry {
  private accounts = new Map<string, InstagramGrowthAccount>();
  private sellerActions: InstagramSellerAction[] = [];

  addAccount(params: {
    id?: string;
    handle: string;
    displayName?: string;
    accountType?: InstagramGrowthAccountType;
    source: string;
    matchScore?: number;
    now?: number;
  }): InstagramGrowthAccount {
    const id = params.id ?? nextAccountId();
    if (this.accounts.has(id)) throw new Error(`Instagram account "${id}" already exists.`);
    const now = params.now ?? Date.now();
    const account: InstagramGrowthAccount = {
      id,
      handle: normalizeHandle(params.handle),
      displayName: params.displayName?.trim() || undefined,
      accountType: params.accountType ?? 'unknown',
      stage: 'found',
      source: requireNonEmpty(params.source, 'source'),
      matchScore: params.matchScore,
      signals: {},
      contacts: [],
      consent: [],
      warmupPaths: [],
      eligibility: {
        status: 'needs-review',
        reason: 'Account is found; classify it and collect public signals before outreach.',
        allowedMethods: [],
      },
      createdAt: now,
      updatedAt: now,
      events: [event('found', 'Instagram account found.', 'system', now)],
    };
    this.accounts.set(id, account);
    return account;
  }

  get(id: string): InstagramGrowthAccount | undefined {
    return this.accounts.get(id);
  }

  private mustGet(id: string): InstagramGrowthAccount {
    const account = this.accounts.get(id);
    if (!account) throw new InstagramGrowthAccountNotFoundError(id);
    return account;
  }

  all(): InstagramGrowthAccount[] {
    return [...this.accounts.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  listByStage(stage: InstagramGrowthStage): InstagramGrowthAccount[] {
    return this.all().filter((account) => account.stage === stage);
  }

  listArchive(): InstagramGrowthAccount[] {
    return this.all().filter((account) => ['archived', 'opted-out', 'blocked'].includes(account.stage));
  }

  listSellerHandoffs(status?: InstagramSellerHandoff['status']): InstagramSellerHandoff[] {
    return this.all()
      .map((account) => account.sellerHandoff)
      .filter((handoff): handoff is InstagramSellerHandoff => Boolean(handoff))
      .filter((handoff) => !status || handoff.status === status);
  }

  private transition(
    account: InstagramGrowthAccount,
    stage: InstagramGrowthStage,
    note: string,
    actor = 'system',
    now = Date.now()
  ): InstagramGrowthAccount {
    if (hasOptedOut(account) && stage !== 'opted-out' && stage !== 'blocked') {
      throw new Error(`Account "${account.id}" has opted out; future outreach is blocked.`);
    }
    account.stage = stage;
    account.updatedAt = now;
    account.events.push(event(stage, note, actor, now));
    account.eligibility = this.evaluateEligibility(account.id);
    return account;
  }

  classify(id: string, accountType: InstagramGrowthAccountType, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    account.accountType = accountType;
    return this.transition(account, 'classified', `Classified as ${accountType}.`, actor, now);
  }

  collectPublicSignals(
    id: string,
    signals: InstagramPublicSignals,
    actor = 'system',
    now = Date.now()
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    account.signals = {
      bio: signals.bio?.trim() || account.signals.bio,
      category: signals.category?.trim() || account.signals.category,
      website: signals.website?.trim() || account.signals.website,
      linkedSocials: [...new Set([...(account.signals.linkedSocials ?? []), ...(signals.linkedSocials ?? [])])],
      notes: [...(account.signals.notes ?? []), ...(signals.notes ?? [])].filter(Boolean),
    };
    return this.transition(account, 'public-signal-collected', 'Public Instagram signals collected.', actor, now);
  }

  addContact(
    id: string,
    params: {
      kind: InstagramContactKind;
      value: string;
      source: InstagramContactSource;
      proof: string;
      publicBusinessContact?: boolean;
      now?: number;
    },
    actor = 'system'
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    const value = requireNonEmpty(params.value, 'value');
    const proof = requireNonEmpty(params.proof, 'proof');
    if (sourceLooksProhibited(value) || sourceLooksProhibited(proof) || sourceLooksProhibited(params.source)) {
      return this.transition(account, 'blocked', 'Blocked because the contact source appears guessed, scraped, fake, or purchased.', actor, params.now);
    }
    account.contacts.push({
      kind: params.kind,
      value,
      source: params.source,
      proof,
      publicBusinessContact: Boolean(params.publicBusinessContact),
      capturedAt: params.now ?? Date.now(),
    });
    return this.transition(account, 'contact-enriched', `Contact captured from ${params.source}.`, actor, params.now);
  }

  recordWarmupPath(
    id: string,
    path: InstagramWarmupPath,
    actor = 'system',
    now = Date.now()
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    if (!account.warmupPaths.includes(path)) account.warmupPaths.push(path);
    const stage = WARMUP_STAGE_BY_PATH[path] ?? 'warmup-needed';
    return this.transition(account, stage, `Warm-up path recorded: ${path}.`, actor, now);
  }

  preparePermissionMessage(id: string, script: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    requireNonEmpty(script, 'script');
    const decision = this.evaluateEligibility(id);
    if (decision.status === 'blocked') throw new Error(decision.reason);
    if (account.accountType === 'personal' && !hasEngagement(account)) {
      throw new Error('Personal accounts cannot receive cold automated DMs; create engagement or use manual legal review.');
    }
    if (!hasEngagement(account) && !hasPublicBusinessContact(account)) {
      throw new Error('No engagement or public business contact source exists for a permission message.');
    }
    return this.transition(account, 'permission-message-ready', 'Permission-first message prepared.', actor, now);
  }

  sendPermissionMessage(id: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    if (account.stage !== 'permission-message-ready') {
      throw new Error(`Account "${id}" must be permission-message-ready before sending.`);
    }
    return this.transition(account, 'permission-message-sent', 'Permission-first message sent.', actor, now);
  }

  recordReply(
    id: string,
    params: { consentGranted: boolean; proof: string; source?: InstagramConsentRecord['source']; now?: number },
    actor = 'system'
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    const now = params.now ?? Date.now();
    const proof = requireNonEmpty(params.proof, 'proof');
    account.consent.push({
      state: params.consentGranted ? 'granted' : 'pending',
      source: params.source ?? 'reply',
      proof,
      recordedAt: now,
    });
    return this.transition(account, params.consentGranted ? 'consented' : 'replied', 'Reply recorded.', actor, now);
  }

  convertContactAfterConsent(id: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    if (!hasGrantedConsent(account)) throw new Error('Cannot convert contact before consent is granted.');
    if (account.contacts.length === 0) throw new Error('Cannot convert contact without a sourced contact point.');
    return this.transition(account, 'converted-contact', 'Contact activated after consent.', actor, now);
  }

  markBookingReady(id: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    if (account.stage !== 'converted-contact' && account.stage !== 'consented') {
      throw new Error('Booking can only be prepared after consent or contact conversion.');
    }
    return this.transition(account, 'booking-ready', 'Ready for booking, meeting, CRM, or deal routing.', actor, now);
  }

  recordOptOut(id: string, proof: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    account.consent.push({ state: 'opted-out', source: 'opt_out', proof: requireNonEmpty(proof, 'proof'), recordedAt: now });
    if (account.sellerHandoff) account.sellerHandoff.status = 'opted-out';
    return this.transition(account, 'opted-out', 'Opt-out recorded; future outreach blocked.', actor, now);
  }

  archive(id: string, reason: string, actor = 'system', now = Date.now()): InstagramGrowthAccount {
    const account = this.mustGet(id);
    account.archiveReason = requireNonEmpty(reason, 'reason');
    return this.transition(account, 'archived', `Archived: ${account.archiveReason}.`, actor, now);
  }

  enqueueSellerHandoff(
    id: string,
    params: {
      assignedSeller: string;
      allowedMethod: SellerHandoffMethod;
      reason: string;
      script: string;
      maxAttempts: number;
      deadlineAt: number;
      manualOnly?: boolean;
      noAutomation?: boolean;
      sellerAccountVerified?: boolean;
      now?: number;
    },
    actor = 'system'
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    if (hasOptedOut(account)) throw new Error('Cannot hand off an opted-out account.');
    if (params.manualOnly === false || params.noAutomation === false) {
      throw new Error('Seller handoff must be manual-only and no-automation.');
    }
    if (params.sellerAccountVerified === false) {
      throw new Error('Seller handoff requires a real/verified seller account.');
    }
    const method = params.allowedMethod;
    if (method === 'phone' || method === 'whatsapp' || method === 'email') {
      const requiredKind = method === 'email' ? 'email' : method;
      const contact = account.contacts.find((c) => c.kind === requiredKind && c.proof);
      if (!contact) {
        throw new Error(`Cannot hand off by ${method} without a sourced ${requiredKind} contact point.`);
      }
    }
    const now = params.now ?? Date.now();
    account.sellerHandoff = {
      id: nextHandoffId(),
      accountId: id,
      assignedSeller: requireNonEmpty(params.assignedSeller, 'assignedSeller'),
      allowedMethod: method,
      reason: requireNonEmpty(params.reason, 'reason'),
      script: requireNonEmpty(params.script, 'script'),
      maxAttempts: requirePositiveInteger(params.maxAttempts, 'maxAttempts'),
      attempts: 0,
      deadlineAt: params.deadlineAt,
      status: 'queued',
      manualOnly: params.manualOnly ?? true,
      noAutomation: params.noAutomation ?? true,
      sellerAccountVerified: params.sellerAccountVerified ?? true,
      createdAt: now,
    };
    return this.transition(account, 'human-handoff-needed', 'Queued for compliant human seller handoff.', actor, now);
  }

  recordSellerAction(
    id: string,
    params: { outcome: InstagramSellerAction['outcome']; note: string; now?: number },
    actor = 'seller'
  ): InstagramGrowthAccount {
    const account = this.mustGet(id);
    const handoff = account.sellerHandoff;
    if (!handoff) throw new Error(`Account "${id}" has no seller handoff.`);
    if (handoff.status === 'blocked' || handoff.status === 'opted-out') {
      throw new Error(`Seller handoff "${handoff.id}" is ${handoff.status}.`);
    }
    if (handoff.attempts >= handoff.maxAttempts) {
      handoff.status = 'blocked';
      return this.transition(account, 'blocked', 'Seller handoff max attempts reached.', actor, params.now);
    }
    const now = params.now ?? Date.now();
    handoff.attempts += 1;
    handoff.lastOutcome = params.outcome;
    const action: InstagramSellerAction = {
      handoffId: handoff.id,
      accountId: id,
      seller: handoff.assignedSeller,
      method: handoff.allowedMethod,
      outcome: params.outcome,
      note: requireNonEmpty(params.note, 'note'),
      recordedAt: now,
    };
    this.sellerActions.push(action);
    if (params.outcome === 'opt-out') {
      handoff.status = 'opted-out';
      return this.recordOptOut(id, action.note, actor, now);
    }
    handoff.status = params.outcome === 'success' ? 'success' : params.outcome;
    const stage: InstagramGrowthStage =
      params.outcome === 'success' ? 'seller-success' : params.outcome === 'no-response' ? 'seller-no-response' : 'seller-contacted';
    return this.transition(account, stage, `Seller action recorded: ${params.outcome}.`, actor, now);
  }

  listSellerActions(accountId?: string): InstagramSellerAction[] {
    return this.sellerActions.filter((action) => !accountId || action.accountId === accountId);
  }

  evaluateEligibility(id: string): InstagramEligibilityDecision {
    const account = this.mustGet(id);
    if (hasOptedOut(account)) {
      return { status: 'blocked', reason: 'Opt-out exists; block all future outreach.', allowedMethods: [] };
    }
    if (account.stage === 'blocked') {
      return { status: 'blocked', reason: 'Account is blocked due to an invalid/prohibited source or max attempts.', allowedMethods: [] };
    }
    const allowedMethods: string[] = [];
    if (hasEngagement(account)) {
      allowedMethods.push('permission_dm_after_engagement');
    }
    if (hasPublicBusinessContact(account)) {
      allowedMethods.push('public_business_contact_permission_first');
    }
    if (account.signals.website) {
      allowedMethods.push('website_or_bio_link_capture');
    }
    if (isBusinessLike(account.accountType) && !hasPublicBusinessContact(account)) {
      allowedMethods.push('retargeting_or_public_content_warmup');
    }
    if (account.accountType === 'personal' && !hasEngagement(account)) {
      return {
        status: 'needs-review',
        reason: 'Personal account has no user-initiated engagement; cold automated DM is not allowed.',
        allowedMethods: ['retargeting_ad', 'content_warmup', 'comment_keyword', 'story_reply', 'bio_link'],
      };
    }
    if (allowedMethods.length === 0) {
      return {
        status: 'needs-review',
        reason: 'No consent, engagement, or sourced public contact exists yet.',
        allowedMethods: ['warmup_needed', 'human_review'],
      };
    }
    return {
      status: 'allowed',
      reason: 'At least one compliant source, engagement, or warm-up path exists.',
      allowedMethods,
      sourceProof: account.contacts.find((contact) => contact.proof)?.proof,
    };
  }

  metrics(): InstagramFunnelMetrics {
    const accounts = this.all();
    return {
      totalFound: accounts.length,
      classified: accounts.filter((a) => a.accountType !== 'unknown' || a.stage === 'classified').length,
      publicSignalsFound: accounts.filter((a) => a.stage === 'public-signal-collected' || a.signals.bio || a.signals.website).length,
      publicContactFound: accounts.filter((a) => a.contacts.length > 0).length,
      eligible: accounts.filter((a) => this.evaluateEligibility(a.id).status === 'allowed').length,
      engaged: accounts.filter((a) => hasEngagement(a)).length,
      permissionSent: accounts.filter((a) => a.stage === 'permission-message-sent').length,
      consented: accounts.filter((a) => hasGrantedConsent(a)).length,
      converted: accounts.filter((a) => a.stage === 'converted-contact' || a.stage === 'booking-ready').length,
      booked: accounts.filter((a) => a.stage === 'booking-ready').length,
      archived: accounts.filter((a) => a.stage === 'archived').length,
      sellerHandoff: accounts.filter((a) => a.sellerHandoff).length,
      optedOut: accounts.filter((a) => hasOptedOut(a)).length,
      blocked: accounts.filter((a) => a.stage === 'blocked').length,
    };
  }
}
