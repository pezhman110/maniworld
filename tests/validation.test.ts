import {
  coerceNonNegativeNumber,
  InvalidNumericInputError,
  validateAchievedCounts,
  validateNonNegativeNumber,
} from '../src/modules/validation';

describe('validation', () => {
  it('accepts a valid non-negative number', () => {
    expect(validateNonNegativeNumber(42, 'count')).toBe(42);
    expect(validateNonNegativeNumber(0, 'count')).toBe(0);
  });

  it('rejects negative numbers', () => {
    expect(() => validateNonNegativeNumber(-1, 'count')).toThrow(InvalidNumericInputError);
  });

  it('rejects non-numeric values', () => {
    expect(() => validateNonNegativeNumber('abc', 'count')).toThrow(InvalidNumericInputError);
    expect(() => validateNonNegativeNumber(NaN, 'count')).toThrow(InvalidNumericInputError);
    expect(() => validateNonNegativeNumber(Infinity, 'count')).toThrow(InvalidNumericInputError);
    expect(() => validateNonNegativeNumber(undefined, 'count')).toThrow(InvalidNumericInputError);
  });

  it('coerces valid numeric strings, falling back for invalid input', () => {
    expect(coerceNonNegativeNumber('12')).toBe(12);
    expect(coerceNonNegativeNumber('-5', 99)).toBe(99);
    expect(coerceNonNegativeNumber('not a number', 7)).toBe(7);
    expect(coerceNonNegativeNumber(undefined, 3)).toBe(3);
  });

  it('validates a whole record of achieved counts', () => {
    expect(validateAchievedCounts({ salon_1: 10, salon_2: 0 })).toEqual({ salon_1: 10, salon_2: 0 });
    expect(() => validateAchievedCounts({ salon_1: -3 })).toThrow(InvalidNumericInputError);
  });
});
