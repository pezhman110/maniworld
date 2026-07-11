import { isValidPhoneFormat, normalizePhone } from './phoneValidation';

/**
 * Consent Conversion Accelerator.
 *
 * Turns social/account records into a final legal contact-output queue. It is
 * deliberately consent-first: scraped, guessed, purchased, fake-account, or
 * unproven sources are blocked; duplicate work is collapsed before spend; and
 * phone/WhatsApp output is only marked ready when consent and proof exist.
 */

export type ConsentConversionPlatform =
  | 'instagram'
  | 'linkedin'
  | 'facebook'
  | 'website'
  | 'whatsapp'
  | 'telegram'
  | 'email'
  | 'phone';

export type ConsentConversionSource =
  | 'owned_form'
  | 'lead_ad'
  | 'inbound_message'
  | 'public_business_contact'
  | 'website_public_contact'
  | 'crm_consented'
  | 'manual_review'
  | 'scraped'
  | 'guessed'
  | 'purchased'
  | 'fake_account';

export type ConsentConversionContactKind = 'phone' | 'whatsapp' | 'email' | 'website' | 'form';

export type ConsentConversionStatus = 'ready' | 'needs-consent' | 'manual-review' | 'duplicate' | 'blocked';

export interface ConsentConversionContact {
  kind: ConsentConversionContactKind;
  value: string;
  verified?: boolean;
  proof: string;
}

export interface ConsentConversionRecord {
  id: string;
  platform: ConsentConversionPlatform;
  accountHandle: string;
  displayName?: string;
  source: ConsentConversionSource;
  sourceProof: string;
  accountKind: 'personal' | 'business' | 'company' | 'creator' | 'unknown';
  matchScore: number;
  estimatedCostMinor: number;
  engagementSignal?: string;
  contact?: ConsentConversionContact;
  consent: {
    granted: boolean;
    proof?: string;
  };
  status: ConsentConversionStatus;
  qualityScore: number;
  recommendation: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConsentConversionFinalOutputItem {
  id: string;
  platform: ConsentConversionPlatform;
  accountHandle: string;
  displayName?: string;
  contactKind?: ConsentConversionContactKind;
  contactValue?: string;
  status: ConsentConversionStatus;
  qualityScore: number;
  estimatedCostMinor: number;
  recommendation: string;
}

export interface ConsentConversionFinalOutput {
  summary: {
    total: number;
    ready: number;
    needsConsent: number;
    manualReview: number;
    duplicates: number;
    blocked: number;
    estimatedSpendMinor: number;
    avoidedSpendMinor: number;
  };
  items: ConsentConversionFinalOutputItem[];
  json: ConsentConversionFinalOutputItem[];
  csv: string;
}

const PROHIBITED_SOURCES = new Set<ConsentConversionSource>(['scraped', 'guessed', 'purchased', 'fake_account']);
const PROHIBITED_TEXT = ['scrape', 'scraped', 'guess', 'guessed', 'purchased', 'bought', 'fake'];
const CONSENTED_SOURCES = new Set<ConsentConversionSource>(['owned_form', 'lead_ad', 'inbound_message', 'crm_consented']);
const PUBLIC_BUSINESS_SOURCES = new Set<ConsentConversionSource>(['public_business_contact', 'website_public_contact']);

let seq = 0;

function nextId(): string {
  seq += 1;
  return `consent_conversion_${Date.now()}_${seq}`;
}

function requireText(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value.trim();
}

function clampScore(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value)) throw new Error('"matchScore" must be a finite number.');
  return Math.max(0, Math.min(100, Math.round(value)));
}

function looksProhibited(value: string | undefined): boolean {
  const lower = value?.toLowerCase() ?? '';
  return PROHIBITED_TEXT.some((term) => lower.includes(term));
}

function normalizeHandle(handle: string): string {
  return requireText(handle, 'accountHandle').replace(/^@+/, '').toLowerCase();
}

function normalizeContactValue(contact: ConsentConversionContact): string {
  if (contact.kind === 'phone' || contact.kind === 'whatsapp') {
    if (!isValidPhoneFormat(contact.value)) throw new Error(`"${contact.kind}" must be a valid phone number.`);
    return normalizePhone(contact.value);
  }
  return contact.value.trim().toLowerCase();
}

function csvEscape(value: string | number | undefined): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export class ConsentConversionAcceleratorRegistry {
  private records = new Map<string, ConsentConversionRecord>();
  private accountKeys = new Map<string, string>();
  private contactKeys = new Map<string, string>();

  submitAccount(params: {
    id?: string;
    platform: ConsentConversionPlatform;
    accountHandle: string;
    displayName?: string;
    source: ConsentConversionSource;
    sourceProof: string;
    accountKind?: ConsentConversionRecord['accountKind'];
    matchScore?: number;
    estimatedCostMinor?: number;
    engagementSignal?: string;
    contact?: ConsentConversionContact;
    consentGranted?: boolean;
    consentProof?: string;
    now?: number;
  }): ConsentConversionRecord {
    const id = params.id ?? nextId();
    if (this.records.has(id)) throw new Error(`Consent conversion record "${id}" already exists.`);

    const normalizedHandle = normalizeHandle(params.accountHandle);
    const accountKey = `${params.platform}:${normalizedHandle}`;
    const sourceProof = requireText(params.sourceProof, 'sourceProof');
    const now = params.now ?? Date.now();
    const contact = params.contact
      ? {
          ...params.contact,
          value: normalizeContactValue({ ...params.contact, proof: requireText(params.contact.proof, 'contact.proof') }),
          proof: requireText(params.contact.proof, 'contact.proof'),
        }
      : undefined;

    const record: ConsentConversionRecord = {
      id,
      platform: params.platform,
      accountHandle: normalizedHandle,
      displayName: params.displayName?.trim() || undefined,
      source: params.source,
      sourceProof,
      accountKind: params.accountKind ?? 'unknown',
      matchScore: clampScore(params.matchScore),
      estimatedCostMinor: Math.max(0, Math.round(params.estimatedCostMinor ?? 0)),
      engagementSignal: params.engagementSignal?.trim() || undefined,
      contact,
      consent: {
        granted: Boolean(params.consentGranted),
        proof: params.consentProof?.trim() || undefined,
      },
      status: 'manual-review',
      qualityScore: 0,
      recommendation: '',
      createdAt: now,
      updatedAt: now,
    };

    const duplicateOf = this.accountKeys.get(accountKey) ?? (contact ? this.contactKeys.get(`${contact.kind}:${contact.value}`) : undefined);
    if (duplicateOf) {
      record.status = 'duplicate';
      record.recommendation = `Duplicate of ${duplicateOf}; do not spend again.`;
    } else {
      this.accountKeys.set(accountKey, id);
      if (contact) this.contactKeys.set(`${contact.kind}:${contact.value}`, id);
      this.refreshDecision(record);
    }

    this.records.set(id, record);
    return record;
  }

  recordConsent(id: string, proof: string, now = Date.now()): ConsentConversionRecord {
    const record = this.mustGet(id);
    record.consent = { granted: true, proof: requireText(proof, 'proof') };
    record.updatedAt = now;
    this.refreshDecision(record);
    return record;
  }

  attachContact(id: string, contact: ConsentConversionContact, now = Date.now()): ConsentConversionRecord {
    const record = this.mustGet(id);
    const normalized = normalizeContactValue({ ...contact, proof: requireText(contact.proof, 'contact.proof') });
    const existing = this.contactKeys.get(`${contact.kind}:${normalized}`);
    if (existing && existing !== id) {
      record.status = 'duplicate';
      record.recommendation = `Duplicate contact of ${existing}; do not spend again.`;
    } else {
      record.contact = { ...contact, value: normalized, proof: requireText(contact.proof, 'contact.proof') };
      this.contactKeys.set(`${contact.kind}:${normalized}`, id);
      this.refreshDecision(record);
    }
    record.updatedAt = now;
    return record;
  }

  get(id: string): ConsentConversionRecord | undefined {
    return this.records.get(id);
  }

  all(): ConsentConversionRecord[] {
    return [...this.records.values()].sort((a, b) => a.createdAt - b.createdAt);
  }

  finalOutput(minQualityScore = 0): ConsentConversionFinalOutput {
    const records = this.all().filter((record) => record.qualityScore >= minQualityScore);
    const items = records
      .map((record) => this.toOutputItem(record))
      .sort((a, b) => statusRank(a.status) - statusRank(b.status) || b.qualityScore - a.qualityScore);
    const summary = {
      total: records.length,
      ready: records.filter((record) => record.status === 'ready').length,
      needsConsent: records.filter((record) => record.status === 'needs-consent').length,
      manualReview: records.filter((record) => record.status === 'manual-review').length,
      duplicates: records.filter((record) => record.status === 'duplicate').length,
      blocked: records.filter((record) => record.status === 'blocked').length,
      estimatedSpendMinor: records
        .filter((record) => record.status === 'ready' || record.status === 'needs-consent' || record.status === 'manual-review')
        .reduce((sum, record) => sum + record.estimatedCostMinor, 0),
      avoidedSpendMinor: records
        .filter((record) => record.status === 'duplicate' || record.status === 'blocked')
        .reduce((sum, record) => sum + record.estimatedCostMinor, 0),
    };
    return {
      summary,
      items,
      json: items,
      csv: toCsv(items),
    };
  }

  private mustGet(id: string): ConsentConversionRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Consent conversion record "${id}" not found.`);
    return record;
  }

  private refreshDecision(record: ConsentConversionRecord): void {
    record.qualityScore = this.score(record);

    if (
      PROHIBITED_SOURCES.has(record.source) ||
      looksProhibited(record.sourceProof) ||
      looksProhibited(record.contact?.proof) ||
      looksProhibited(record.contact?.value)
    ) {
      record.status = 'blocked';
      record.recommendation = 'Blocked: source/contact looks scraped, guessed, purchased, or fake.';
      return;
    }

    if (!record.contact) {
      record.status = record.engagementSignal || PUBLIC_BUSINESS_SOURCES.has(record.source) ? 'needs-consent' : 'manual-review';
      record.recommendation = 'Collect contact through an owned form, lead ad, inbound reply, or proven public business channel.';
      return;
    }

    if (record.consent.granted && record.consent.proof) {
      record.status = 'ready';
      record.recommendation = 'Ready for final output: contact is consented, sourced, and deduplicated.';
      return;
    }

    if (CONSENTED_SOURCES.has(record.source)) {
      record.status = 'needs-consent';
      record.recommendation = 'Consent source exists, but proof must be recorded before final phone output.';
      return;
    }

    if (PUBLIC_BUSINESS_SOURCES.has(record.source)) {
      record.status = 'needs-consent';
      record.recommendation = 'Use permission-first outreach; do not activate the phone until opt-in proof is recorded.';
      return;
    }

    record.status = 'manual-review';
    record.recommendation = 'Manual legal review required before contact activation.';
  }

  private score(record: ConsentConversionRecord): number {
    let score = record.matchScore;
    if (record.consent.granted && record.consent.proof) score += 25;
    if (record.contact?.verified) score += 15;
    if (record.contact && PUBLIC_BUSINESS_SOURCES.has(record.source)) score += 10;
    if (record.engagementSignal) score += 10;
    if (record.estimatedCostMinor === 0) score += 5;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private toOutputItem(record: ConsentConversionRecord): ConsentConversionFinalOutputItem {
    return {
      id: record.id,
      platform: record.platform,
      accountHandle: record.accountHandle,
      displayName: record.displayName,
      contactKind: record.status === 'ready' ? record.contact?.kind : undefined,
      contactValue: record.status === 'ready' ? record.contact?.value : undefined,
      status: record.status,
      qualityScore: record.qualityScore,
      estimatedCostMinor: record.estimatedCostMinor,
      recommendation: record.recommendation,
    };
  }
}

function statusRank(status: ConsentConversionStatus): number {
  return { ready: 0, 'needs-consent': 1, 'manual-review': 2, duplicate: 3, blocked: 4 }[status];
}

function toCsv(items: ConsentConversionFinalOutputItem[]): string {
  const headers = [
    'id',
    'platform',
    'accountHandle',
    'displayName',
    'contactKind',
    'contactValue',
    'status',
    'qualityScore',
    'estimatedCostMinor',
    'recommendation',
  ];
  const rows = items.map((item) => headers.map((header) => csvEscape(item[header as keyof ConsentConversionFinalOutputItem])).join(','));
  return [headers.join(','), ...rows].join('\n');
}
