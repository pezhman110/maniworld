import { RawLeadInput, Lead } from '../types/domain';
import { normalizePhone } from './phoneValidation';

/**
 * Lead intake module.
 *
 * Responsible for turning a raw form submission into a normalized `Lead`
 * record, applying anti-spam checks (honeypot + time-trap) and requiring
 * explicit consent before a lead is accepted into the pipeline.
 */

export class SpamDetectedError extends Error {
  constructor(reason: string) {
    super(`Spam submission rejected: ${reason}`);
    this.name = 'SpamDetectedError';
  }
}

export class ConsentRequiredError extends Error {
  constructor() {
    super('Lead cannot be created without granted consent.');
    this.name = 'ConsentRequiredError';
  }
}

const MIN_FORM_FILL_TIME_MS = 1500;

export interface SpamCheckResult {
  isSpam: boolean;
  reasons: string[];
}

/** Detects obvious bot submissions using a honeypot field and a minimum fill-time trap. */
export function detectSpam(input: RawLeadInput): SpamCheckResult {
  const reasons: string[] = [];

  if (input.honeypot && input.honeypot.trim().length > 0) {
    reasons.push('honeypot-filled');
  }

  if (input.formRenderedAt && input.submittedAt) {
    const fillTime = input.submittedAt - input.formRenderedAt;
    if (fillTime >= 0 && fillTime < MIN_FORM_FILL_TIME_MS) {
      reasons.push('too-fast-submission');
    }
  }

  if (!input.fullName || input.fullName.trim().length < 2) {
    reasons.push('missing-name');
  }

  if (!input.phone || input.phone.trim().length < 6) {
    reasons.push('invalid-phone-length');
  }

  return { isSpam: reasons.length > 0, reasons };
}

let leadSequence = 0;
function nextLeadId(): string {
  leadSequence += 1;
  return `lead_${Date.now()}_${leadSequence}`;
}

export interface IntakeOptions {
  /** When true, spam leads are stored (flagged) instead of throwing. Defaults to true (store-and-flag). */
  storeSpamLeads?: boolean;
  /** When true, requires consent === 'granted' or throws ConsentRequiredError. Defaults to true. */
  requireConsent?: boolean;
}

/**
 * Creates a normalized Lead entity from raw form input.
 * Does NOT check for duplicates - that's the responsibility of the phone
 * validation module, since duplicate detection depends on the existing lead store.
 */
export function createLeadFromInput(
  input: RawLeadInput,
  options: IntakeOptions = {}
): Lead {
  const { storeSpamLeads = true, requireConsent = true } = options;

  if (requireConsent && input.consent !== 'granted') {
    throw new ConsentRequiredError();
  }

  const spamCheck = detectSpam(input);
  if (spamCheck.isSpam && !storeSpamLeads) {
    throw new SpamDetectedError(spamCheck.reasons.join(', '));
  }

  const normalizedPhone = normalizePhone(input.phone);

  const lead: Lead = {
    id: nextLeadId(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    normalizedPhone,
    email: input.email?.trim(),
    channel: input.channel,
    message: input.message?.trim(),
    utm: input.utm,
    consent: input.consent,
    createdAt: input.submittedAt ?? Date.now(),
    isDuplicate: false,
    isSpam: spamCheck.isSpam,
  };

  return lead;
}
