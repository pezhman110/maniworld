/**
 * LinkedIn Legal Growth, Contact & Seller Handoff Engine.
 *
 * A consent-first operational model for LinkedIn personal and company leads.
 * It supports profile/company discovery, legal contact-path selection, Lead Gen
 * Forms, ABM/matched-audience proof, scoring, seller assignment, seller brief
 * cards, and a technical tools/connectors page. It never performs scraping,
 * guessed emails, bulk spam, fake-account activity, or unauthorized messaging.
 */

export type LinkedInLeadScope = 'personal' | 'company';

export type LinkedInLeadType =
  | 'investor'
  | 'buyer'
  | 'seller'
  | 'partner'
  | 'freelancer'
  | 'influencer'
  | 'candidate'
  | 'executive'
  | 'decision-maker'
  | 'hotel'
  | 'salon-group'
  | 'vendor'
  | 'supplier'
  | 'unknown';

export type LinkedInContactPath =
  | 'connection-request'
  | 'sales-navigator-inmail'
  | 'accepted-connection-message'
  | 'conversation-ad'
  | 'message-ad'
  | 'lead-gen-form'
  | 'matched-audience'
  | 'company-list-abm'
  | 'contact-list-targeting'
  | 'website-retargeting'
  | 'landing-page'
  | 'public-company-contact'
  | 'manual-seller-review';

export type LinkedInLeadStage =
  | 'found'
  | 'classified'
  | 'scored'
  | 'legal-path-selected'
  | 'connection-request-ready'
  | 'connection-accepted'
  | 'inmail-ready'
  | 'ad-ready'
  | 'lead-form-submitted'
  | 'responded'
  | 'consented'
  | 'meeting-ready'
  | 'seller-assigned'
  | 'seller-contacted'
  | 'deal-room-ready'
  | 'archived'
  | 'opted-out'
  | 'blocked';

export type LinkedInConsentStatus = 'none' | 'pending' | 'granted' | 'declined' | 'opted-out';
export type LinkedInEligibilityStatus = 'allowed' | 'needs-review' | 'blocked';
export type LinkedInSellerActionName =
  | 'open-linkedin-profile'
  | 'send-approved-message'
  | 'send-inmail'
  | 'send-connection-follow-up'
  | 'open-lead-gen-form-data'
  | 'book-meeting'
  | 'send-pitch-deck'
  | 'request-documents'
  | 'move-to-deal-room'
  | 'mark-consent-captured'
  | 'mark-not-interested'
  | 'archive'
  | 'handoff-to-manager';

export type LinkedInToolStatus = 'awaiting' | 'legal' | 'connected';
export type LinkedInSellerWorkbenchTab =
  | 'my-assigned-leads'
  | 'hot-leads'
  | 'waiting-for-reply'
  | 'meeting-ready'
  | 'need-call'
  | 'need-inmail'
  | 'need-connection-follow-up'
  | 'lead-gen-form-submissions'
  | 'buyer-leads'
  | 'seller-leads'
  | 'investor-leads'
  | 'corporate-partner-leads'
  | 'archive-not-ready'
  | 'my-targets'
  | 'my-tools';

export interface LinkedInContactPoint {
  channel: 'linkedin' | 'email' | 'phone' | 'whatsapp' | 'website' | 'form' | 'crm';
  value?: string;
  source: string;
  confidence: number;
  consentStatus: LinkedInConsentStatus;
  proof: string;
  lastAction: string;
  nextAllowedAction: LinkedInContactPath | 'wait' | 'archive' | 'seller-call';
  capturedAt: number;
}

export interface LinkedInOutreachPlan {
  path: LinkedInContactPath;
  approvedTemplate: string;
  legalGateRequired: boolean;
  allowedHours: { startHour: number; endHour: number };
  noBulkMessaging: boolean;
  manualOnly: boolean;
  proof: string;
  createdAt: number;
}

export interface LinkedInLeadGenSubmission {
  formId: string;
  campaignId?: string;
  hiddenFields?: Record<string, string>;
  answers: Record<string, string>;
  proof: string;
  submittedAt: number;
}

export interface LinkedInConsentRecord {
  status: LinkedInConsentStatus;
  source: 'reply' | 'lead-gen-form' | 'landing-page' | 'crm' | 'manual' | 'opt-out';
  proof: string;
  recordedAt: number;
}

export interface LinkedInTimelineEvent {
  stage: LinkedInLeadStage;
  note: string;
  actor: string;
  timestamp: number;
}

export interface LinkedInSellerBriefCard {
  leadName: string;
  profileUrl?: string;
  companyUrl?: string;
  leadType: LinkedInLeadType;
  scope: LinkedInLeadScope;
  source: string;
  campaign?: string;
  messageHistory: string[];
  latestResponse?: string;
  email?: string;
  phone?: string;
  consentStatus: LinkedInConsentStatus;
  score: number;
  priority: 'hot' | 'warm' | 'nurture' | 'archive';
  interest?: string;
  budgetOrTicketSize?: string;
  industry?: string;
  timeline?: string;
  recommendedNextAction: string;
  suggestedMessage: string;
  meetingLink?: string;
  filesOrFormsSubmitted: string[];
  archiveRisk: string;
  ownerSeller: string;
  slaFollowUpDeadline: number;
  availableActions: LinkedInSellerActionName[];
}

export interface LinkedInSellerAssignment {
  id: string;
  leadId: string;
  seller: string;
  reason: string;
  status: 'queued' | 'contacted' | 'meeting-booked' | 'deal-room' | 'archived' | 'opted-out';
  brief: LinkedInSellerBriefCard;
  createdAt: number;
  updatedAt: number;
}

export interface LinkedInLead {
  id: string;
  name: string;
  scope: LinkedInLeadScope;
  leadType: LinkedInLeadType;
  stage: LinkedInLeadStage;
  source: string;
  profileUrl?: string;
  companyUrl?: string;
  companyName?: string;
  role?: string;
  country?: string;
  city?: string;
  industry?: string;
  campaign?: string;
  score: number;
  contactPoints: LinkedInContactPoint[];
  outreachPlans: LinkedInOutreachPlan[];
  consent: LinkedInConsentRecord[];
  leadForms: LinkedInLeadGenSubmission[];
  messageHistory: string[];
  latestResponse?: string;
  meetingLink?: string;
  dealRoomId?: string;
  eligibility: { status: LinkedInEligibilityStatus; reason: string; allowedPaths: LinkedInContactPath[] };
  sellerAssignment?: LinkedInSellerAssignment;
  createdAt: number;
  updatedAt: number;
  timeline: LinkedInTimelineEvent[];
}

export interface LinkedInTechnicalTool {
  name: string;
  provider: 'LinkedIn' | 'Globex' | 'Legal';
  purpose: string;
  requiredFor: string[];
  status: LinkedInToolStatus;
  apiVerified: boolean;
  sandboxTested: boolean;
  credentialsStored: boolean;
  webhookReady: boolean;
  dataExportAvailable: boolean;
  legalGateStatus: 'required' | 'approved' | 'not-required';
  owner: string;
  notes: string;
}

export interface LinkedInWorkbench {
  seller: string;
  tabs: Record<LinkedInSellerWorkbenchTab, LinkedInSellerAssignment[]>;
  tools: LinkedInTechnicalTool[];
}

const PROHIBITED_TEXT = ['scrape', 'scraping', 'guessed', 'guess', 'purchased', 'bought', 'fake', 'bulk spam', 'browser extension'];
const PERSONAL_PATHS: LinkedInContactPath[] = [
  'connection-request',
  'sales-navigator-inmail',
  'accepted-connection-message',
  'conversation-ad',
  'lead-gen-form',
  'landing-page',
];
const COMPANY_PATHS: LinkedInContactPath[] = [
  'company-list-abm',
  'matched-audience',
  'conversation-ad',
  'message-ad',
  'lead-gen-form',
  'website-retargeting',
  'public-company-contact',
  'landing-page',
];
const WORKBENCH_TABS: LinkedInSellerWorkbenchTab[] = [
  'my-assigned-leads',
  'hot-leads',
  'waiting-for-reply',
  'meeting-ready',
  'need-call',
  'need-inmail',
  'need-connection-follow-up',
  'lead-gen-form-submissions',
  'buyer-leads',
  'seller-leads',
  'investor-leads',
  'corporate-partner-leads',
  'archive-not-ready',
  'my-targets',
  'my-tools',
];

let leadSeq = 0;
let assignmentSeq = 0;

function nextLeadId(): string {
  leadSeq += 1;
  return `linkedin_lead_${Date.now()}_${leadSeq}`;
}

function nextAssignmentId(): string {
  assignmentSeq += 1;
  return `linkedin_assignment_${Date.now()}_${assignmentSeq}`;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value.trim();
}

function clampScore(score: number | undefined): number {
  if (score === undefined) return 0;
  if (!Number.isFinite(score)) throw new Error('"score" must be a finite number.');
  return Math.max(0, Math.min(100, Math.round(score)));
}

function requireConfidence(confidence: number): number {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('"confidence" must be between 0 and 1.');
  }
  return confidence;
}

function containsProhibitedText(...values: Array<string | undefined>): boolean {
  const text = values.filter(Boolean).join(' ').toLowerCase();
  return PROHIBITED_TEXT.some((term) => text.includes(term));
}

function event(stage: LinkedInLeadStage, note: string, actor: string, timestamp: number): LinkedInTimelineEvent {
  return { stage, note, actor, timestamp };
}

function priority(score: number): LinkedInSellerBriefCard['priority'] {
  if (score >= 85) return 'hot';
  if (score >= 70) return 'warm';
  if (score >= 50) return 'nurture';
  return 'archive';
}

function defaultTools(): LinkedInTechnicalTool[] {
  return [
    ['LinkedIn Sales Navigator', 'LinkedIn', 'High-value individual InMail and account research', ['investor', 'buyer', 'seller'], 'required'],
    ['LinkedIn Campaign Manager', 'LinkedIn', 'Conversation Ads, Message Ads, and reporting', ['ads', 'retargeting'], 'required'],
    ['LinkedIn Lead Gen Forms', 'LinkedIn', 'Prefilled lawful email/phone capture with proof', ['investor', 'buyer', 'seller', 'partner'], 'required'],
    ['LinkedIn Lead Sync API', 'LinkedIn', 'Sync Lead Gen Form submissions to CRM', ['crm-sync'], 'required'],
    ['LinkedIn Marketing API', 'LinkedIn', 'Campaign reporting and compliant audience workflows', ['ads', 'reporting'], 'required'],
    ['LinkedIn Matched Audiences', 'LinkedIn', 'Contact/company list, website, page, form, and ad retargeting', ['abm', 'retargeting'], 'required'],
    ['LinkedIn Insight Tag / Website Retargeting', 'LinkedIn', 'Retarget website visitors without hidden extraction', ['website-retargeting'], 'required'],
    ['LinkedIn Conversation Ads', 'LinkedIn', 'Multi-CTA decision-maker conversation flow', ['b2b', 'forms'], 'required'],
    ['LinkedIn Message Ads', 'LinkedIn', 'Approved sponsored message campaigns', ['b2b'], 'required'],
    ['LinkedIn Company Page Access', 'LinkedIn', 'Company discovery and page engagement audiences', ['company'], 'required'],
    ['Consent Ledger', 'Globex', 'Consent source, proof, opt-out, and eligibility state', ['all-leads'], 'required'],
    ['Audit Log', 'Globex', 'Immutable operational timeline', ['all-leads'], 'required'],
    ['CRM', 'Globex', 'Lead routing and seller ownership', ['seller-handoff'], 'required'],
    ['Target Board', 'Globex', 'Market/account target tracking', ['abm'], 'required'],
    ['Meeting Engine', 'Globex', 'Booking links and seller capacity', ['meeting'], 'required'],
    ['Seller Assignment Engine', 'Globex', 'Seller specialty/capacity assignment', ['seller-handoff'], 'required'],
    ['Deal Room', 'Globex', 'Buyer/seller/investor document handoff', ['deal'], 'required'],
    ['Landing Page Builder', 'Globex', 'Consent-first forms and pitch pages', ['landing-page'], 'required'],
    ['Document Vault', 'Globex', 'Pitch decks, valuation files, and seller documents', ['files'], 'required'],
    ['Notification Engine', 'Globex', 'SLA reminders and owner notifications', ['seller'], 'required'],
    ['Email Connector', 'Globex', 'Follow-up only when eligible/consented', ['email'], 'required'],
    ['WhatsApp Connector', 'Globex', 'Follow-up only when eligible/consented', ['whatsapp'], 'required'],
    ['Calendar Connector', 'Globex', 'Meeting booking and confirmations', ['meeting'], 'required'],
    ['Consent Management', 'Legal', 'Consent-first gate for every contact point', ['all-leads'], 'required'],
    ['Opt-out Manager', 'Legal', 'Universal opt-out across LinkedIn, email, phone, WhatsApp, SMS', ['all-leads'], 'required'],
    ['Allowed Hours Guard', 'Legal', 'Local allowed-hours enforcement before seller action', ['seller'], 'required'],
    ['Approval Workflow', 'Legal', 'Approves templates, campaigns, and sensitive flows', ['messaging'], 'required'],
    ['Secret Vault', 'Legal', 'No secrets in frontend; credentials stored server-side only', ['connectors'], 'required'],
    ['Policy Gate', 'Legal', 'Blocks risky modules before go-live until approved', ['all-leads'], 'required'],
  ].map(([name, provider, purpose, requiredFor, legalGateStatus]) => ({
    name: name as string,
    provider: provider as LinkedInTechnicalTool['provider'],
    purpose: purpose as string,
    requiredFor: requiredFor as string[],
    status: 'awaiting',
    apiVerified: false,
    sandboxTested: false,
    credentialsStored: false,
    webhookReady: false,
    dataExportAvailable: false,
    legalGateStatus: legalGateStatus as LinkedInTechnicalTool['legalGateStatus'],
    owner: 'unassigned',
    notes: '',
  }));
}

export class LinkedInLeadNotFoundError extends Error {
  constructor(id: string) {
    super(`LinkedIn lead "${id}" not found.`);
    this.name = 'LinkedInLeadNotFoundError';
  }
}

export class LinkedInLegalGrowthRegistry {
  private leads = new Map<string, LinkedInLead>();
  private assignments = new Map<string, LinkedInSellerAssignment>();
  private tools = new Map<string, LinkedInTechnicalTool>(defaultTools().map((tool) => [tool.name, tool]));

  addLead(params: {
    id?: string;
    name: string;
    scope: LinkedInLeadScope;
    source: string;
    profileUrl?: string;
    companyUrl?: string;
    companyName?: string;
    role?: string;
    country?: string;
    city?: string;
    industry?: string;
    campaign?: string;
    leadType?: LinkedInLeadType;
    score?: number;
    now?: number;
  }): LinkedInLead {
    const id = params.id ?? nextLeadId();
    if (this.leads.has(id)) throw new Error(`LinkedIn lead "${id}" already exists.`);
    const source = requireNonEmpty(params.source, 'source');
    if (containsProhibitedText(source)) throw new Error('LinkedIn lead source cannot be scraped, guessed, purchased, fake, or spam/bulk based.');
    const now = params.now ?? Date.now();
    const lead: LinkedInLead = {
      id,
      name: requireNonEmpty(params.name, 'name'),
      scope: params.scope,
      leadType: params.leadType ?? 'unknown',
      stage: 'found',
      source,
      profileUrl: params.profileUrl?.trim() || undefined,
      companyUrl: params.companyUrl?.trim() || undefined,
      companyName: params.companyName?.trim() || undefined,
      role: params.role?.trim() || undefined,
      country: params.country?.trim() || undefined,
      city: params.city?.trim() || undefined,
      industry: params.industry?.trim() || undefined,
      campaign: params.campaign?.trim() || undefined,
      score: clampScore(params.score),
      contactPoints: [],
      outreachPlans: [],
      consent: [],
      leadForms: [],
      messageHistory: [],
      eligibility: { status: 'needs-review', reason: 'Lead found; classify type and choose a legal path.', allowedPaths: [] },
      createdAt: now,
      updatedAt: now,
      timeline: [event('found', 'LinkedIn person/company lead found.', 'system', now)],
    };
    lead.eligibility = this.evaluateEligibilityRecord(lead);
    this.leads.set(id, lead);
    return lead;
  }

  get(id: string): LinkedInLead | undefined {
    return this.leads.get(id);
  }

  all(): LinkedInLead[] {
    return [...this.leads.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  private mustGet(id: string): LinkedInLead {
    const lead = this.leads.get(id);
    if (!lead) throw new LinkedInLeadNotFoundError(id);
    return lead;
  }

  private transition(lead: LinkedInLead, stage: LinkedInLeadStage, note: string, actor = 'system', now = Date.now()): LinkedInLead {
    if (this.hasOptedOut(lead) && stage !== 'opted-out' && stage !== 'blocked') {
      throw new Error(`LinkedIn lead "${lead.id}" has opted out; all future contact is blocked.`);
    }
    lead.stage = stage;
    lead.updatedAt = now;
    lead.timeline.push(event(stage, note, actor, now));
    lead.eligibility = this.evaluateEligibilityRecord(lead);
    return lead;
  }

  classify(id: string, params: { scope?: LinkedInLeadScope; leadType: LinkedInLeadType; score?: number }, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (params.scope) lead.scope = params.scope;
    lead.leadType = params.leadType;
    if (params.score !== undefined) lead.score = clampScore(params.score);
    return this.transition(lead, params.score !== undefined ? 'scored' : 'classified', `Classified as ${lead.scope}/${lead.leadType}.`, actor);
  }

  score(id: string, score: number, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    lead.score = clampScore(score);
    return this.transition(lead, 'scored', `Lead scored ${lead.score}.`, actor);
  }

  addContactPoint(id: string, params: Omit<LinkedInContactPoint, 'capturedAt'> & { capturedAt?: number }, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (containsProhibitedText(params.source, params.proof, params.value)) {
      lead.eligibility = { status: 'blocked', reason: 'Prohibited contact source detected.', allowedPaths: [] };
      return this.transition(lead, 'blocked', 'Blocked because contact source/proof indicates scraping, guessing, purchase, fake account, or bulk spam.', actor);
    }
    const contact: LinkedInContactPoint = {
      channel: params.channel,
      value: params.value?.trim() || undefined,
      source: requireNonEmpty(params.source, 'source'),
      confidence: requireConfidence(params.confidence),
      consentStatus: params.consentStatus,
      proof: requireNonEmpty(params.proof, 'proof'),
      lastAction: requireNonEmpty(params.lastAction, 'lastAction'),
      nextAllowedAction: params.nextAllowedAction,
      capturedAt: params.capturedAt ?? Date.now(),
    };
    lead.contactPoints.push(contact);
    if (contact.consentStatus === 'granted' || contact.consentStatus === 'opted-out') {
      lead.consent.push({
        status: contact.consentStatus,
        source: contact.consentStatus === 'opted-out' ? 'opt-out' : 'manual',
        proof: contact.proof,
        recordedAt: contact.capturedAt,
      });
    }
    return this.transition(lead, contact.consentStatus === 'opted-out' ? 'opted-out' : 'legal-path-selected', 'Contact point stored with source, confidence, consent, proof, and next action.', actor, contact.capturedAt);
  }

  selectLegalPath(id: string, params: Omit<LinkedInOutreachPlan, 'createdAt'> & { createdAt?: number }, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (containsProhibitedText(params.approvedTemplate, params.proof)) {
      return this.transition(lead, 'blocked', 'Blocked prohibited LinkedIn outreach plan.', actor);
    }
    if (!params.noBulkMessaging) throw new Error('LinkedIn outreach plan must explicitly disable bulk messaging.');
    if (params.allowedHours.startHour < 0 || params.allowedHours.endHour > 24 || params.allowedHours.startHour >= params.allowedHours.endHour) {
      throw new Error('Allowed hours must be a valid local window.');
    }
    const allowedPaths = lead.scope === 'personal' ? PERSONAL_PATHS : COMPANY_PATHS;
    if (!allowedPaths.includes(params.path)) throw new Error(`Path "${params.path}" is not suitable for ${lead.scope} LinkedIn leads.`);
    lead.outreachPlans.push({ ...params, proof: requireNonEmpty(params.proof, 'proof'), createdAt: params.createdAt ?? Date.now() });
    let stage: LinkedInLeadStage = 'legal-path-selected';
    if (params.path === 'connection-request') stage = 'connection-request-ready';
    if (params.path === 'sales-navigator-inmail') stage = 'inmail-ready';
    if (['conversation-ad', 'message-ad', 'matched-audience', 'company-list-abm', 'contact-list-targeting', 'website-retargeting'].includes(params.path)) stage = 'ad-ready';
    return this.transition(lead, stage, `Legal LinkedIn path selected: ${params.path}.`, actor, params.createdAt);
  }

  recordConnectionAccepted(id: string, proof: string, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    lead.messageHistory.push('Connection accepted; first follow-up must remain permission-based.');
    return this.transition(lead, 'connection-accepted', requireNonEmpty(proof, 'proof'), actor);
  }

  recordResponse(
    id: string,
    params: { message: string; consentGranted?: boolean; email?: string; phone?: string; proof: string; now?: number },
    actor = 'system'
  ): LinkedInLead {
    const lead = this.mustGet(id);
    if (containsProhibitedText(params.message, params.proof, params.email, params.phone)) {
      return this.transition(lead, 'blocked', 'Blocked prohibited response/contact proof.', actor, params.now);
    }
    const now = params.now ?? Date.now();
    lead.latestResponse = requireNonEmpty(params.message, 'message');
    lead.messageHistory.push(lead.latestResponse);
    if (params.consentGranted) {
      lead.consent.push({ status: 'granted', source: 'reply', proof: requireNonEmpty(params.proof, 'proof'), recordedAt: now });
      if (params.email) this.pushContact(lead, 'email', params.email, 'direct LinkedIn reply', params.proof, now);
      if (params.phone) this.pushContact(lead, 'phone', params.phone, 'direct LinkedIn reply', params.proof, now);
      return this.transition(lead, 'consented', 'Positive response and consent recorded.', actor, now);
    }
    return this.transition(lead, 'responded', 'LinkedIn response recorded.', actor, now);
  }

  submitLeadGenForm(id: string, params: Omit<LinkedInLeadGenSubmission, 'submittedAt'> & { submittedAt?: number }, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (containsProhibitedText(params.proof, ...Object.values(params.answers || {}))) {
      return this.transition(lead, 'blocked', 'Blocked prohibited Lead Gen Form proof.', actor, params.submittedAt);
    }
    const submittedAt = params.submittedAt ?? Date.now();
    const submission: LinkedInLeadGenSubmission = {
      formId: requireNonEmpty(params.formId, 'formId'),
      campaignId: params.campaignId?.trim() || undefined,
      hiddenFields: params.hiddenFields,
      answers: params.answers ?? {},
      proof: requireNonEmpty(params.proof, 'proof'),
      submittedAt,
    };
    lead.leadForms.push(submission);
    lead.consent.push({ status: 'granted', source: 'lead-gen-form', proof: submission.proof, recordedAt: submittedAt });
    if (submission.answers.Email) this.pushContact(lead, 'email', submission.answers.Email, 'LinkedIn Lead Gen Form', submission.proof, submittedAt);
    if (submission.answers.Phone) this.pushContact(lead, 'phone', submission.answers.Phone, 'LinkedIn Lead Gen Form', submission.proof, submittedAt);
    if (submission.answers['Ticket Size'] || submission.answers.Budget) lead.score = Math.max(lead.score, 75);
    return this.transition(lead, 'lead-form-submitted', 'LinkedIn Lead Gen Form submitted and synced-ready for CRM.', actor, submittedAt);
  }

  markMeetingReady(id: string, meetingLink: string, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (!this.hasGrantedConsent(lead)) throw new Error('Cannot mark LinkedIn lead meeting-ready without consent or form submission.');
    lead.meetingLink = requireNonEmpty(meetingLink, 'meetingLink');
    return this.transition(lead, 'meeting-ready', 'Meeting link attached.', actor);
  }

  moveToDealRoom(id: string, dealRoomId: string, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (!lead.sellerAssignment) throw new Error('Assign the LinkedIn lead to a seller before moving to Deal Room.');
    lead.dealRoomId = requireNonEmpty(dealRoomId, 'dealRoomId');
    if (lead.sellerAssignment) {
      lead.sellerAssignment.status = 'deal-room';
      lead.sellerAssignment.updatedAt = Date.now();
    }
    return this.transition(lead, 'deal-room-ready', 'Lead routed to Deal Room.', actor);
  }

  recordOptOut(id: string, proof: string, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    const now = Date.now();
    lead.consent.push({ status: 'opted-out', source: 'opt-out', proof: requireNonEmpty(proof, 'proof'), recordedAt: now });
    if (lead.sellerAssignment) {
      lead.sellerAssignment.status = 'opted-out';
      lead.sellerAssignment.updatedAt = now;
    }
    return this.transition(lead, 'opted-out', 'Universal opt-out recorded across LinkedIn, email, phone, WhatsApp, and SMS.', actor, now);
  }

  archive(id: string, reason: string, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (lead.sellerAssignment) {
      lead.sellerAssignment.status = 'archived';
      lead.sellerAssignment.updatedAt = Date.now();
    }
    return this.transition(lead, 'archived', requireNonEmpty(reason, 'reason'), actor);
  }

  assignSeller(
    id: string,
    params: { seller: string; reason: string; slaFollowUpDeadline: number; suggestedMessage?: string; forceNoReplyPhoneHandoff?: boolean },
    actor = 'system'
  ): LinkedInLead {
    const lead = this.mustGet(id);
    const ready = this.isReadyForSeller(lead);
    const legallySourcedPhone = lead.contactPoints.some((contact) => contact.channel === 'phone' && Boolean(contact.value) && contact.consentStatus !== 'opted-out' && contact.proof);
    if (!ready && !(params.forceNoReplyPhoneHandoff && legallySourcedPhone)) {
      throw new Error('LinkedIn lead is not ready for seller handoff: require score >=75 with consent/response/form, or a legally sourced no-reply phone handoff.');
    }
    const now = Date.now();
    const assignment: LinkedInSellerAssignment = {
      id: nextAssignmentId(),
      leadId: lead.id,
      seller: requireNonEmpty(params.seller, 'seller'),
      reason: requireNonEmpty(params.reason, 'reason'),
      status: 'queued',
      brief: this.buildSellerBrief(lead, params.seller, params.slaFollowUpDeadline, params.suggestedMessage),
      createdAt: now,
      updatedAt: now,
    };
    lead.sellerAssignment = assignment;
    this.assignments.set(assignment.id, assignment);
    return this.transition(lead, 'seller-assigned', 'Lead assigned to seller with Seller Brief Card and tools.', actor, now);
  }

  recordSellerAction(id: string, params: { action: LinkedInSellerActionName; note: string; status?: LinkedInSellerAssignment['status'] }, actor = 'system'): LinkedInLead {
    const lead = this.mustGet(id);
    if (!lead.sellerAssignment) throw new Error('LinkedIn lead has no seller assignment.');
    lead.sellerAssignment.status = params.status ?? 'contacted';
    lead.sellerAssignment.updatedAt = Date.now();
    lead.messageHistory.push(`Seller action ${params.action}: ${requireNonEmpty(params.note, 'note')}`);
    return this.transition(lead, 'seller-contacted', `Seller action recorded by ${actor}: ${params.action}.`, actor);
  }

  listAssignments(seller?: string): LinkedInSellerAssignment[] {
    return [...this.assignments.values()]
      .filter((assignment) => !seller || assignment.seller === seller)
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  buildWorkbench(seller: string): LinkedInWorkbench {
    const assignments = this.listAssignments(seller);
    const emptyTabs = WORKBENCH_TABS.reduce((tabs, tab) => {
      tabs[tab] = [];
      return tabs;
    }, {} as Record<LinkedInSellerWorkbenchTab, LinkedInSellerAssignment[]>);

    for (const assignment of assignments) {
      const lead = this.mustGet(assignment.leadId);
      emptyTabs['my-assigned-leads'].push(assignment);
      if (assignment.brief.priority === 'hot') emptyTabs['hot-leads'].push(assignment);
      if (lead.stage === 'responded' || lead.stage === 'legal-path-selected') emptyTabs['waiting-for-reply'].push(assignment);
      if (lead.stage === 'meeting-ready') emptyTabs['meeting-ready'].push(assignment);
      if (lead.contactPoints.some((contact) => contact.channel === 'phone')) emptyTabs['need-call'].push(assignment);
      if (lead.outreachPlans.some((plan) => plan.path === 'sales-navigator-inmail')) emptyTabs['need-inmail'].push(assignment);
      if (lead.stage === 'connection-accepted') emptyTabs['need-connection-follow-up'].push(assignment);
      if (lead.leadForms.length) emptyTabs['lead-gen-form-submissions'].push(assignment);
      if (lead.leadType === 'buyer') emptyTabs['buyer-leads'].push(assignment);
      if (lead.leadType === 'seller') emptyTabs['seller-leads'].push(assignment);
      if (lead.leadType === 'investor') emptyTabs['investor-leads'].push(assignment);
      if (lead.leadType === 'partner' || lead.scope === 'company') emptyTabs['corporate-partner-leads'].push(assignment);
      if (assignment.brief.priority === 'archive' || lead.stage === 'archived') emptyTabs['archive-not-ready'].push(assignment);
      emptyTabs['my-targets'].push(assignment);
    }
    return { seller, tabs: emptyTabs, tools: this.listTools() };
  }

  listTools(): LinkedInTechnicalTool[] {
    return [...this.tools.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  updateTool(name: string, patch: Partial<Omit<LinkedInTechnicalTool, 'name' | 'provider' | 'purpose' | 'requiredFor'>>, actor = 'system'): LinkedInTechnicalTool {
    const tool = this.tools.get(requireNonEmpty(name, 'name'));
    if (!tool) throw new Error(`LinkedIn technical tool "${name}" not found.`);
    Object.assign(tool, patch);
    tool.notes = [tool.notes, patch.notes, `Updated by ${actor}.`].filter(Boolean).join(' ');
    return tool;
  }

  evaluateEligibility(id: string): LinkedInLead['eligibility'] {
    const lead = this.mustGet(id);
    lead.eligibility = this.evaluateEligibilityRecord(lead);
    return lead.eligibility;
  }

  metrics() {
    const leads = this.all();
    return {
      total: leads.length,
      personal: leads.filter((lead) => lead.scope === 'personal').length,
      company: leads.filter((lead) => lead.scope === 'company').length,
      consented: leads.filter((lead) => this.hasGrantedConsent(lead)).length,
      leadForms: leads.filter((lead) => lead.leadForms.length > 0).length,
      sellerAssigned: leads.filter((lead) => Boolean(lead.sellerAssignment)).length,
      hot: leads.filter((lead) => priority(lead.score) === 'hot').length,
      archived: leads.filter((lead) => lead.stage === 'archived').length,
      optedOut: leads.filter((lead) => lead.stage === 'opted-out').length,
      blocked: leads.filter((lead) => lead.stage === 'blocked').length,
    };
  }

  private pushContact(lead: LinkedInLead, channel: LinkedInContactPoint['channel'], value: string, source: string, proof: string, now: number) {
    lead.contactPoints.push({
      channel,
      value: requireNonEmpty(value, channel),
      source,
      confidence: 1,
      consentStatus: 'granted',
      proof,
      lastAction: 'captured after explicit LinkedIn consent/form',
      nextAllowedAction: 'seller-call',
      capturedAt: now,
    });
  }

  private hasGrantedConsent(lead: LinkedInLead): boolean {
    return lead.consent.some((record) => record.status === 'granted') || lead.contactPoints.some((contact) => contact.consentStatus === 'granted');
  }

  private hasOptedOut(lead: LinkedInLead): boolean {
    return lead.stage === 'opted-out' || lead.consent.some((record) => record.status === 'opted-out') || lead.contactPoints.some((contact) => contact.consentStatus === 'opted-out');
  }

  private isReadyForSeller(lead: LinkedInLead): boolean {
    return lead.leadType !== 'unknown' && lead.score >= 75 && (this.hasGrantedConsent(lead) || lead.leadForms.length > 0 || Boolean(lead.latestResponse));
  }

  private evaluateEligibilityRecord(lead: LinkedInLead): LinkedInLead['eligibility'] {
    if (lead.stage === 'blocked') return { status: 'blocked', reason: 'Lead is blocked by compliance gate.', allowedPaths: [] };
    if (this.hasOptedOut(lead)) return { status: 'blocked', reason: 'Universal opt-out is active.', allowedPaths: [] };
    if (containsProhibitedText(lead.source)) return { status: 'blocked', reason: 'Source indicates prohibited acquisition.', allowedPaths: [] };
    const allowedPaths = lead.scope === 'personal' ? PERSONAL_PATHS : COMPANY_PATHS;
    if (lead.leadType === 'unknown') return { status: 'needs-review', reason: 'Lead type must be classified before contact.', allowedPaths };
    if (this.hasGrantedConsent(lead) || lead.leadForms.length > 0 || lead.latestResponse) {
      return { status: 'allowed', reason: 'Consent, response, or official form proof exists.', allowedPaths };
    }
    return { status: 'needs-review', reason: 'Use only approved LinkedIn path; first message must be permission-based and non-bulk.', allowedPaths };
  }

  private buildSellerBrief(lead: LinkedInLead, seller: string, deadline: number, suggestedMessage?: string): LinkedInSellerBriefCard {
    const email = lead.contactPoints.find((contact) => contact.channel === 'email')?.value;
    const phone = lead.contactPoints.find((contact) => contact.channel === 'phone')?.value;
    const latestForm = lead.leadForms[lead.leadForms.length - 1];
    return {
      leadName: lead.name,
      profileUrl: lead.profileUrl,
      companyUrl: lead.companyUrl,
      leadType: lead.leadType,
      scope: lead.scope,
      source: lead.source,
      campaign: lead.campaign ?? latestForm?.campaignId,
      messageHistory: [...lead.messageHistory],
      latestResponse: lead.latestResponse,
      email,
      phone,
      consentStatus: this.hasOptedOut(lead) ? 'opted-out' : this.hasGrantedConsent(lead) ? 'granted' : 'pending',
      score: lead.score,
      priority: priority(lead.score),
      interest: latestForm?.answers.Interest || latestForm?.answers['Preferred Sector'],
      budgetOrTicketSize: latestForm?.answers.Budget || latestForm?.answers['Ticket Size'],
      industry: lead.industry || latestForm?.answers['Preferred Industry'],
      timeline: latestForm?.answers.Timeline,
      recommendedNextAction: this.recommendNextAction(lead),
      suggestedMessage: suggestedMessage || this.suggestedMessage(lead),
      meetingLink: lead.meetingLink,
      filesOrFormsSubmitted: lead.leadForms.map((form) => form.formId),
      archiveRisk: lead.score < 50 ? 'Low score: archive if no new proof appears.' : 'No immediate archive risk if SLA is met.',
      ownerSeller: seller,
      slaFollowUpDeadline: deadline,
      availableActions: [
        'open-linkedin-profile',
        'send-approved-message',
        'send-inmail',
        'send-connection-follow-up',
        'open-lead-gen-form-data',
        'book-meeting',
        'send-pitch-deck',
        'request-documents',
        'move-to-deal-room',
        'mark-consent-captured',
        'mark-not-interested',
        'archive',
        'handoff-to-manager',
      ],
    };
  }

  private recommendNextAction(lead: LinkedInLead): string {
    if (this.hasOptedOut(lead)) return 'Archive; universal opt-out blocks all channels.';
    if (lead.meetingLink) return 'Confirm meeting and prepare agenda.';
    if (lead.leadForms.length) return 'Review Lead Gen Form answers, call/email if consent allows, and book meeting.';
    if (lead.latestResponse && this.hasGrantedConsent(lead)) return 'Book meeting or request documents.';
    if (lead.outreachPlans.some((plan) => plan.path === 'sales-navigator-inmail')) return 'Send one approved personalized InMail; no bulk messaging.';
    if (lead.scope === 'company') return 'Run ABM/company-list path to decision makers or Lead Gen Form.';
    return 'Send personalized connection request or permission-first message; stop after no reply.';
  }

  private suggestedMessage(lead: LinkedInLead): string {
    if (lead.leadType === 'seller') return 'Thanks for your interest. May I send the confidential valuation checklist and book a short call?';
    if (lead.leadType === 'buyer') return 'Thanks for confirming. May I share matching UAE business opportunities and book a qualification call?';
    if (lead.leadType === 'investor') return 'Thanks for your interest. May I send the investment summary and schedule a short intro meeting?';
    if (lead.scope === 'company') return 'Thanks for connecting. May I send a short B2B partnership overview for your team?';
    return 'Thanks for replying. May I send a short introduction and next-step link?';
  }
}
