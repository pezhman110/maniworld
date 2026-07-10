/**
 * Compliant investor acquisition engine.
 *
 * This implements the "20 advanced tools" request as executable CRM logic,
 * while replacing unsafe items (fake accounts, anti-detection, private
 * monitoring, scraped/purchased contacts, face recognition matching) with
 * consent-first, official-API, public/owned-data alternatives.
 */

export type InvestorToolCategory =
  | 'intelligent-targeting'
  | 'communication-automation'
  | 'conversion-optimization'
  | 'data-verification'
  | 'campaign-operations'
  | 'advanced-acquisition';

export type InvestorToolCompliance = 'ready' | 'guarded' | 'replaced';
export type InvestorComplianceStatus = 'allowed' | 'needs-review' | 'blocked';
export type InvestorPriority = 'hot' | 'warm' | 'cold' | 'blocked';
export type InvestorPersona = 'risk-averse-investor' | 'aggressive-growth' | 'passive-income' | 'business-buyer' | 'unknown';
export type InvestorIntent = 'investment-intent' | 'business-buying' | 'wealth-search' | 'unknown';

export type InvestorSignalSource =
  | 'inbound_form'
  | 'owned_crm'
  | 'lead_gen_form'
  | 'public_business_profile'
  | 'consented_event_scan'
  | 'website_consent_pixel'
  | 'manual_event_badge_scan'
  | 'private_group'
  | 'scraped_contact'
  | 'purchased_list'
  | 'fake_account'
  | 'anti_detection'
  | 'face_recognition';

export interface InvestorAcquisitionTool {
  id: number;
  key: string;
  title: string;
  category: InvestorToolCategory;
  compliance: InvestorToolCompliance;
  executableCapabilities: string[];
  blockedCapabilities: string[];
  safeReplacement?: string;
}

export interface InvestorLeadSignalInput {
  id?: string;
  fullName?: string;
  company?: string;
  source: InvestorSignalSource;
  sourceProof: string;
  message?: string;
  consentGranted?: boolean;
  publicBusinessContact?: boolean;
  investorAmount?: number;
  urgencyWords?: string[];
  declaredInterests?: string[];
  channels?: string[];
  region?: string;
  now?: number;
}

export interface InvestorSignalEvaluation {
  complianceStatus: InvestorComplianceStatus;
  blockedReasons: string[];
  triggeredIntent: InvestorIntent;
  persona: InvestorPersona;
  score: number;
  priority: InvestorPriority;
  allowedActions: string[];
  nextBestAction: string;
  matchedToolIds: number[];
}

export interface InvestorLeadRecord extends InvestorLeadSignalInput {
  id: string;
  createdAt: number;
  evaluation: InvestorSignalEvaluation;
  outreachPlan: string[];
}

export interface InvestorPlaybook {
  id: string;
  name: string;
  objective: string;
  region?: string;
  channels: string[];
  toolIds: number[];
  stages: string[];
  complianceRules: string[];
  createdAt: number;
}

export interface InvestorAcquisitionMetrics {
  totalLeads: number;
  allowed: number;
  needsReview: number;
  blocked: number;
  hot: number;
  warm: number;
  cold: number;
  playbooks: number;
}

const INVESTMENT_INTENT = ['میخوام سرمایهگذاری کنم', 'می‌خوام سرمایه‌گذاری کنم', 'کجا سرمایه بذارم', 'سود روزانه', 'کسبوکار آماده'];
const BUSINESS_BUYING = ['میخوام بیزینس بخرم', 'می‌خوام بیزینس بخرم', 'فرانچایز', 'کسبوکار آماده', 'فروشگاه آماده'];
const WEALTH_SEARCH = ['چطور پولمو زیاد کنم', 'سرمایهگذاری مطمئن', 'سرمایه‌گذاری مطمئن', 'درآمد غیرفعال'];

const RISK_AVERSE = ['امن', 'مطمئن', 'سود ثابت', 'کم ریسک', 'کم‌ریسک'];
const AGGRESSIVE = ['سود بالا', 'رشد سریع', 'فرصت استثنایی'];
const PASSIVE = ['درآمد غیرفعال', 'کاری نکنم پول بیاد', 'بدون زحمت'];

const BLOCKED_SOURCES = new Set<InvestorSignalSource>([
  'private_group',
  'scraped_contact',
  'purchased_list',
  'fake_account',
  'anti_detection',
  'face_recognition',
]);

export const INVESTOR_ACQUISITION_TOOLS: InvestorAcquisitionTool[] = [
  {
    id: 1,
    key: 'intent-based-listening',
    title: 'Intent-Based Listening Platforms',
    category: 'intelligent-targeting',
    compliance: 'guarded',
    executableCapabilities: ['Detect intent from inbound forms, owned CRM notes, public business posts, and consented lead forms.'],
    blockedCapabilities: ['Unsolicited private monitoring and instant cold spam.'],
    safeReplacement: 'Respond fast only to inbound/opt-in or public business signals with proof.',
  },
  {
    id: 2,
    key: 'psychographic-profiling',
    title: 'Psychographic Profiling Engines',
    category: 'intelligent-targeting',
    compliance: 'guarded',
    executableCapabilities: ['Classify messaging preference from self-declared words and campaign responses.'],
    blockedCapabilities: ['Sensitive or manipulative profiling from private data.'],
  },
  {
    id: 3,
    key: 'identity-resolution',
    title: 'Cross-Platform Identity Resolution',
    category: 'intelligent-targeting',
    compliance: 'guarded',
    executableCapabilities: ['Deterministic matching on consented email/phone and owned CRM identifiers.'],
    blockedCapabilities: ['Covert cross-device or probabilistic identity linking without consent.'],
  },
  {
    id: 4,
    key: 'behavioral-triggers',
    title: 'Behavioral Trigger Systems',
    category: 'intelligent-targeting',
    compliance: 'guarded',
    executableCapabilities: ['Detect investment readiness from explicit questions, stated budget, and comparison requests.'],
    blockedCapabilities: ['Predatory targeting of financial distress.'],
    safeReplacement: 'Use educational, non-pressure guidance for distress signals.',
  },
  {
    id: 5,
    key: 'omnichannel-messenger',
    title: 'Multi-Channel Outreach Automation',
    category: 'communication-automation',
    compliance: 'replaced',
    executableCapabilities: ['Opt-in SMS/email/WhatsApp/social follow-up through official APIs and manual seller tasks.'],
    blockedCapabilities: ['Virtual-number rotation, bulk cold DM, and fake sender identities.'],
    safeReplacement: 'Registered sender IDs, WhatsApp Business API templates, unsubscribe/opt-out tracking.',
  },
  {
    id: 6,
    key: 'dynamic-creatives',
    title: 'Dynamic Creative Optimization',
    category: 'communication-automation',
    compliance: 'ready',
    executableCapabilities: ['Generate persona-aligned headline, CTA, offer, and test variant instructions.'],
    blockedCapabilities: [],
  },
  {
    id: 7,
    key: 'conversation-ai',
    title: 'Conversation AI for Initial Engagement',
    category: 'communication-automation',
    compliance: 'guarded',
    executableCapabilities: ['Qualification, objection handling, appointment setting, and human handoff for opted-in leads.'],
    blockedCapabilities: ['AI impersonation without disclosure or consent.'],
  },
  {
    id: 8,
    key: 'predictive-lead-scoring',
    title: 'Predictive Lead Scoring',
    category: 'conversion-optimization',
    compliance: 'ready',
    executableCapabilities: ['Score urgency, budget, declared interest, consent, and source quality.'],
    blockedCapabilities: [],
  },
  {
    id: 9,
    key: 'lookalike-expansion',
    title: 'Lookalike Audience Expansion',
    category: 'conversion-optimization',
    compliance: 'guarded',
    executableCapabilities: ['Build aggregate audiences from consented converters on official ad platforms.'],
    blockedCapabilities: ['Uploading scraped or purchased personal data.'],
  },
  {
    id: 10,
    key: 'progressive-retargeting',
    title: 'Retargeting with Progressive Profiling',
    category: 'conversion-optimization',
    compliance: 'guarded',
    executableCapabilities: ['Sequential retargeting with consent pixels and frequency caps.'],
    blockedCapabilities: ['Cross-device tracking without notice/consent.'],
  },
  {
    id: 11,
    key: 'contact-intelligence',
    title: 'Phone & Email Intelligence Tools',
    category: 'data-verification',
    compliance: 'guarded',
    executableCapabilities: ['Verify user-submitted or public business contact data and store accuracy score.'],
    blockedCapabilities: ['Guessing, scraping, or buying contact details.'],
  },
  {
    id: 12,
    key: 'social-profiler',
    title: 'Social Media Profiling Automation',
    category: 'data-verification',
    compliance: 'guarded',
    executableCapabilities: ['Summarize public business profile facts and declared interests.'],
    blockedCapabilities: ['Wealth inference, private-life profiling, and sensitive trait inference.'],
  },
  {
    id: 13,
    key: 'dark-social-monitor',
    title: 'Dark Social & Private Group Monitoring',
    category: 'data-verification',
    compliance: 'replaced',
    executableCapabilities: ['Monitor only public forums or communities where Mani World is an authorized admin/member and rules allow analysis.'],
    blockedCapabilities: ['Private conversation monitoring and hidden group scraping.'],
    safeReplacement: 'Community insight notes with source proof and no personal outreach unless the user opts in.',
  },
  {
    id: 14,
    key: 'account-orchestrator',
    title: 'Multi-Account Management Systems',
    category: 'campaign-operations',
    compliance: 'replaced',
    executableCapabilities: ['Govern owned official accounts, permissions, budgets, and audit logs.'],
    blockedCapabilities: ['5000 fake accounts, anti-detect browsers, IP/device fingerprint rotation.'],
    safeReplacement: 'Official Business Manager/MCC/company pages with verified owners.',
  },
  {
    id: 15,
    key: 'compliance-manager',
    title: 'Compliance & Platform Safety Systems',
    category: 'campaign-operations',
    compliance: 'replaced',
    executableCapabilities: ['GDPR/CCPA-style consent, encryption, opt-out, audit trail, policy gates.'],
    blockedCapabilities: ['Detection avoidance and human-like behavior simulation to bypass platforms.'],
    safeReplacement: 'Policy compliance controls instead of anti-detection controls.',
  },
  {
    id: 16,
    key: 'performance-monitor',
    title: 'Real-Time Performance Dashboard',
    category: 'campaign-operations',
    compliance: 'ready',
    executableCapabilities: ['Track lead volume, conversion priority, blocked compliance risk, and playbook count.'],
    blockedCapabilities: [],
  },
  {
    id: 17,
    key: 'event-triggered-marketing',
    title: 'Event-Triggered Marketing',
    category: 'advanced-acquisition',
    compliance: 'guarded',
    executableCapabilities: ['Use consented event lists, public business events, and manual badge scans with permission.'],
    blockedCapabilities: ['Sensitive life-event exploitation and court-record targeting.'],
  },
  {
    id: 18,
    key: 'personalized-video',
    title: 'Hyper-Personalized Video Marketing',
    category: 'advanced-acquisition',
    compliance: 'guarded',
    executableCapabilities: ['Create opt-in personalized video brief using declared name, company, region, and interests.'],
    blockedCapabilities: ['Deepfake/voice cloning or undisclosed AI impersonation.'],
  },
  {
    id: 19,
    key: 'referral-amplifier',
    title: 'Referral & Affiliate Amplification',
    category: 'advanced-acquisition',
    compliance: 'ready',
    executableCapabilities: ['Referral codes, reward tracking, referrer dashboard, and payout queue.'],
    blockedCapabilities: [],
  },
  {
    id: 20,
    key: 'offline-online-bridge',
    title: 'Offline-to-Online Bridge Systems',
    category: 'advanced-acquisition',
    compliance: 'replaced',
    executableCapabilities: ['QR/NFC/SMS shortcodes, consented event attendance import, and business-card scan with permission.'],
    blockedCapabilities: ['Face recognition matching from networking photos.'],
    safeReplacement: 'Explicit opt-in QR/NFC/event badge capture routed to CRM.',
  },
];

let leadSeq = 0;
let playbookSeq = 0;

function nextLeadId(): string {
  leadSeq += 1;
  return `investor-lead-${Date.now()}-${leadSeq}`;
}

function nextPlaybookId(): string {
  playbookSeq += 1;
  return `investor-playbook-${Date.now()}-${playbookSeq}`;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value.trim();
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function normalizeList(values?: string[]): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
}

export class InvestorAcquisitionRegistry {
  private leads = new Map<string, InvestorLeadRecord>();
  private playbooks = new Map<string, InvestorPlaybook>();

  listTools(category?: InvestorToolCategory): InvestorAcquisitionTool[] {
    return INVESTOR_ACQUISITION_TOOLS.filter((tool) => !category || tool.category === category);
  }

  evaluateSignal(input: InvestorLeadSignalInput): InvestorSignalEvaluation {
    const sourceProof = requireNonEmpty(input.sourceProof, 'sourceProof');
    const text = [input.message, input.declaredInterests?.join(' '), input.urgencyWords?.join(' ')]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const blockedReasons: string[] = [];

    if (BLOCKED_SOURCES.has(input.source)) {
      blockedReasons.push(`Source "${input.source}" is not allowed for outreach.`);
    }
    if (!input.consentGranted && !input.publicBusinessContact) {
      blockedReasons.push('Lead needs explicit opt-in or a proven public business contact before outreach.');
    }
    if (/scrap|خرید|purchased|fake|anti.?detect|private/i.test(sourceProof)) {
      blockedReasons.push('Source proof mentions scraping, purchased/fake data, anti-detection, or private monitoring.');
    }

    const triggeredIntent: InvestorIntent = includesAny(text, INVESTMENT_INTENT)
      ? 'investment-intent'
      : includesAny(text, BUSINESS_BUYING)
        ? 'business-buying'
        : includesAny(text, WEALTH_SEARCH)
          ? 'wealth-search'
          : 'unknown';

    const persona: InvestorPersona = includesAny(text, RISK_AVERSE)
      ? 'risk-averse-investor'
      : includesAny(text, AGGRESSIVE)
        ? 'aggressive-growth'
        : includesAny(text, PASSIVE)
          ? 'passive-income'
          : triggeredIntent === 'business-buying'
            ? 'business-buyer'
            : 'unknown';

    let score = 0;
    if (input.consentGranted) score += 25;
    if (input.publicBusinessContact) score += 15;
    if (triggeredIntent !== 'unknown') score += 25;
    if (persona !== 'unknown') score += 15;
    if (input.investorAmount && input.investorAmount > 0) score += input.investorAmount >= 100000 ? 15 : 8;
    if (normalizeList(input.channels).length > 0) score += 5;
    score = Math.min(100, score);

    const complianceStatus: InvestorComplianceStatus =
      blockedReasons.some((reason) => reason.includes('not allowed') || reason.includes('scraping') || reason.includes('purchased'))
        ? 'blocked'
        : blockedReasons.length
          ? 'needs-review'
          : 'allowed';

    const priority: InvestorPriority =
      complianceStatus === 'blocked' ? 'blocked' : score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'cold';

    const allowedActions =
      complianceStatus === 'blocked'
        ? ['Do not contact; archive or collect lawful opt-in first.']
        : [
            'Create CRM lead with source proof.',
            'Select persona-aligned creative and script.',
            'Route to human seller or official API follow-up within consent scope.',
            'Apply frequency cap and opt-out tracking.',
          ];

    const matchedToolIds = [1, 2, 4, 6, 8, 11, 16];
    if (input.consentGranted) matchedToolIds.push(5, 7, 10, 18);
    if (input.publicBusinessContact) matchedToolIds.push(3, 12);
    if (input.source === 'manual_event_badge_scan' || input.source === 'consented_event_scan') matchedToolIds.push(17, 20);
    if (priority === 'hot' || priority === 'warm') matchedToolIds.push(19);

    return {
      complianceStatus,
      blockedReasons,
      triggeredIntent,
      persona,
      score,
      priority,
      allowedActions,
      nextBestAction:
        complianceStatus === 'blocked'
          ? 'Stop automation and request lawful opt-in/source correction.'
          : priority === 'hot'
            ? 'Assign to a seller now and prepare consent-scoped personalized pitch.'
            : priority === 'warm'
              ? 'Enroll in opt-in education and retargeting sequence.'
              : 'Keep in nurture; request more declared context before direct outreach.',
      matchedToolIds: [...new Set(matchedToolIds)].sort((a, b) => a - b),
    };
  }

  registerLead(input: InvestorLeadSignalInput): InvestorLeadRecord {
    const id = input.id ?? nextLeadId();
    if (this.leads.has(id)) throw new Error(`Investor lead "${id}" already exists.`);
    const evaluation = this.evaluateSignal(input);
    const outreachPlan =
      evaluation.complianceStatus === 'blocked'
        ? ['Blocked: do not contact until there is explicit opt-in or proven public business contact.']
        : [
            `Priority: ${evaluation.priority}`,
            `Persona: ${evaluation.persona}`,
            evaluation.nextBestAction,
            'Use official APIs/manual seller handoff only; never fake accounts, scraping, or anti-detection.',
          ];
    const lead: InvestorLeadRecord = {
      ...input,
      id,
      sourceProof: requireNonEmpty(input.sourceProof, 'sourceProof'),
      channels: normalizeList(input.channels),
      declaredInterests: normalizeList(input.declaredInterests),
      urgencyWords: normalizeList(input.urgencyWords),
      createdAt: input.now ?? Date.now(),
      evaluation,
      outreachPlan,
    };
    this.leads.set(id, lead);
    return lead;
  }

  listLeads(): InvestorLeadRecord[] {
    return [...this.leads.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  getLead(id: string): InvestorLeadRecord | undefined {
    return this.leads.get(id);
  }

  createPlaybook(params: {
    id?: string;
    name: string;
    objective: string;
    region?: string;
    channels?: string[];
    toolIds?: number[];
    now?: number;
  }): InvestorPlaybook {
    const id = params.id ?? nextPlaybookId();
    if (this.playbooks.has(id)) throw new Error(`Investor playbook "${id}" already exists.`);
    const toolIds = params.toolIds?.length ? params.toolIds : INVESTOR_ACQUISITION_TOOLS.map((tool) => tool.id);
    const knownToolIds = new Set(INVESTOR_ACQUISITION_TOOLS.map((tool) => tool.id));
    const invalid = toolIds.filter((toolId) => !knownToolIds.has(toolId));
    if (invalid.length) throw new Error(`Unknown investor acquisition tool ids: ${invalid.join(', ')}.`);
    const playbook: InvestorPlaybook = {
      id,
      name: requireNonEmpty(params.name, 'name'),
      objective: requireNonEmpty(params.objective, 'objective'),
      region: params.region?.trim() || undefined,
      channels: normalizeList(params.channels).length ? normalizeList(params.channels) : ['website', 'email', 'whatsapp', 'linkedin'],
      toolIds,
      stages: [
        'Capture lawful signal with source proof',
        'Evaluate intent/persona/compliance',
        'Score and prioritize',
        'Generate compliant creative and conversation plan',
        'Route to official API or manual seller handoff',
        'Track conversion, opt-out, and ROI',
      ],
      complianceRules: [
        'No fake/purchased accounts.',
        'No anti-detection or platform-bypass automation.',
        'No private group/conversation monitoring.',
        'No scraped/purchased contacts.',
        'No face-recognition matching.',
        'Every outreach action needs opt-in, public business contact proof, or official lead-form consent.',
      ],
      createdAt: params.now ?? Date.now(),
    };
    this.playbooks.set(id, playbook);
    return playbook;
  }

  listPlaybooks(): InvestorPlaybook[] {
    return [...this.playbooks.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  metrics(): InvestorAcquisitionMetrics {
    const leads = this.listLeads();
    return {
      totalLeads: leads.length,
      allowed: leads.filter((lead) => lead.evaluation.complianceStatus === 'allowed').length,
      needsReview: leads.filter((lead) => lead.evaluation.complianceStatus === 'needs-review').length,
      blocked: leads.filter((lead) => lead.evaluation.complianceStatus === 'blocked').length,
      hot: leads.filter((lead) => lead.evaluation.priority === 'hot').length,
      warm: leads.filter((lead) => lead.evaluation.priority === 'warm').length,
      cold: leads.filter((lead) => lead.evaluation.priority === 'cold').length,
      playbooks: this.playbooks.size,
    };
  }
}
