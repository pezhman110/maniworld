/**
 * Input validation module.
 *
 * Guards the numeric entry points that feed pacing/dashboard calculations
 * (achieved counts, ad spend, staff counts, ...) so a negative or
 * non-numeric value can never silently corrupt a report.
 */

export class InvalidNumericInputError extends Error {
  constructor(fieldName: string, value: unknown) {
    super(`Invalid value for "${fieldName}": expected a non-negative finite number, got ${JSON.stringify(value)}.`);
    this.name = 'InvalidNumericInputError';
  }
}

/** Validates that `value` is a finite, non-negative number. Throws otherwise. */
export function validateNonNegativeNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
    throw new InvalidNumericInputError(fieldName, value);
  }
  return value;
}

/** Same as `validateNonNegativeNumber`, but returns `fallback` instead of throwing for invalid input. */
export function coerceNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return fallback;
}

/** Validates a full "achieved counts" record, e.g. what a dashboard input form submits. */
export function validateAchievedCounts(input: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = validateNonNegativeNumber(value, key);
  }
  return result;
}
