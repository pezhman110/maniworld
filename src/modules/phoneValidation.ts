/**
 * Phone validation & best-number ranking module.
 *
 * Normalizes phone numbers to E.164-like digits-only form, detects
 * duplicates against an existing lead list, and ranks multiple numbers
 * for the same person to identify the "best" reachable number
 * (mobile > verified > landline, most recently active).
 */

export interface PhoneCandidate {
  phone: string;
  /** True if this number is a mobile number (best for WhatsApp/Telegram/SMS). */
  isMobile: boolean;
  /** True if the number has passed an OTP verification round. */
  isVerified: boolean;
  lastActiveAt?: number;
}

/** Strips all non-digit characters and applies Iran (+98) default country code when a local 0-prefixed number is given. */
export function normalizePhone(rawPhone: string): string {
  let digits = rawPhone.replace(/[^\d+]/g, '');
  digits = digits.replace(/^00/, '+');

  if (digits.startsWith('+')) {
    return digits;
  }

  // Local Iranian mobile/landline numbers commonly start with a leading 0.
  if (digits.startsWith('0')) {
    return `+98${digits.slice(1)}`;
  }

  // Already looks like a bare country-code-prefixed number.
  return `+${digits}`;
}

export function isValidPhoneFormat(rawPhone: string): boolean {
  const normalized = normalizePhone(rawPhone);
  // Basic sanity check: + followed by 8-15 digits (ITU E.164 range).
  return /^\+\d{8,15}$/.test(normalized);
}

export interface OtpChallenge {
  phone: string;
  code: string;
  expiresAt: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;

/** Generates a 6-digit OTP challenge for verifying phone ownership. */
export function generateOtpChallenge(phone: string, now: number = Date.now()): OtpChallenge {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  return {
    phone: normalizePhone(phone),
    code,
    expiresAt: now + OTP_TTL_MS,
  };
}

export function verifyOtp(challenge: OtpChallenge, submittedCode: string, now: number = Date.now()): boolean {
  if (now > challenge.expiresAt) {
    return false;
  }
  return challenge.code === submittedCode;
}

/**
 * Given a list of phone candidates for the same person, ranks them and
 * returns the best number to use first, preferring verified mobile numbers
 * with the most recent activity.
 */
export function rankBestPhone(candidates: PhoneCandidate[]): PhoneCandidate | null {
  if (candidates.length === 0) {
    return null;
  }

  const scored = candidates.map((candidate) => {
    let score = 0;
    if (candidate.isMobile) score += 10;
    if (candidate.isVerified) score += 5;
    if (candidate.lastActiveAt) score += Math.min(candidate.lastActiveAt / 1e12, 3);
    return { candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

/** Checks whether a normalized phone number already exists among known phones. */
export function isDuplicatePhone(normalizedPhone: string, existingNormalizedPhones: string[]): boolean {
  return existingNormalizedPhones.includes(normalizedPhone);
}
