import {
  normalizePhone,
  isValidPhoneFormat,
  generateOtpChallenge,
  verifyOtp,
  rankBestPhone,
  isDuplicatePhone,
} from '../src/modules/phoneValidation';

describe('phoneValidation', () => {
  it('normalizes a local Iranian mobile number to E.164', () => {
    expect(normalizePhone('0912 123 4567')).toBe('+989121234567');
  });

  it('normalizes numbers already in international format', () => {
    expect(normalizePhone('+989121234567')).toBe('+989121234567');
  });

  it('converts 00-prefixed numbers to +', () => {
    expect(normalizePhone('00989121234567')).toBe('+989121234567');
  });

  it('validates correct phone formats', () => {
    expect(isValidPhoneFormat('09121234567')).toBe(true);
    expect(isValidPhoneFormat('+14155552671')).toBe(true);
  });

  it('rejects invalid phone formats', () => {
    expect(isValidPhoneFormat('123')).toBe(false);
  });

  it('generates and verifies an OTP challenge within TTL', () => {
    const now = 1_000_000;
    const challenge = generateOtpChallenge('09121234567', now);
    expect(verifyOtp(challenge, challenge.code, now + 1000)).toBe(true);
  });

  it('rejects an OTP after expiry', () => {
    const now = 1_000_000;
    const challenge = generateOtpChallenge('09121234567', now);
    expect(verifyOtp(challenge, challenge.code, now + 6 * 60 * 1000)).toBe(false);
  });

  it('rejects a wrong OTP code', () => {
    const now = 1_000_000;
    const challenge = generateOtpChallenge('09121234567', now);
    expect(verifyOtp(challenge, '__wrong__', now)).toBe(false);
  });

  it('ranks a verified mobile number above an unverified landline', () => {
    const best = rankBestPhone([
      { phone: '02112345678', isMobile: false, isVerified: false },
      { phone: '09121234567', isMobile: true, isVerified: true },
    ]);
    expect(best?.phone).toBe('09121234567');
  });

  it('returns null when ranking an empty candidate list', () => {
    expect(rankBestPhone([])).toBeNull();
  });

  it('detects duplicate phones', () => {
    expect(isDuplicatePhone('+989121234567', ['+989121234567', '+989350000000'])).toBe(true);
    expect(isDuplicatePhone('+989999999999', ['+989121234567'])).toBe(false);
  });
});
