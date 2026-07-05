import { computeAllDeltaComparisons, computeDeltaComparison } from '../src/modules/comparison';

describe('comparison', () => {
  it('labels a doubling vs. yesterday explicitly', () => {
    const delta = computeDeltaComparison({ period: 'yesterday', currentValue: 48, previousValue: 24 });
    expect(delta.ratio).toBe(2);
    expect(delta.direction).toBe('up');
    expect(delta.label).toMatch(/2\.0x yesterday/);
  });

  it('labels a halving vs. last week explicitly', () => {
    const delta = computeDeltaComparison({ period: 'last-week', currentValue: 20, previousValue: 40 });
    expect(delta.ratio).toBe(0.5);
    expect(delta.direction).toBe('down');
    expect(delta.label).toMatch(/half/);
  });

  it('never divides by zero: previousValue 0 returns ratio null instead of Infinity', () => {
    const delta = computeDeltaComparison({ period: 'same-day-last-month', currentValue: 12, previousValue: 0 });
    expect(delta.ratio).toBeNull();
    expect(Number.isFinite(delta.ratio ?? 0)).toBe(true);
    expect(delta.direction).toBe('up');
  });

  it('reports flat when both current and previous are 0', () => {
    const delta = computeDeltaComparison({ period: 'yesterday', currentValue: 0, previousValue: 0 });
    expect(delta.ratio).toBeNull();
    expect(delta.direction).toBe('flat');
  });

  it('computes all three comparison periods at once', () => {
    const deltas = computeAllDeltaComparisons({
      currentValue: 48,
      yesterdayValue: 24,
      lastWeekValue: 96,
      sameDayLastMonthValue: 48,
    });

    expect(deltas.map((d) => d.period)).toEqual(['yesterday', 'last-week', 'same-day-last-month']);
    expect(deltas[0].ratio).toBe(2);
    expect(deltas[1].ratio).toBe(0.5);
    expect(deltas[2].ratio).toBe(1);
    expect(deltas[2].direction).toBe('flat');
  });
});
