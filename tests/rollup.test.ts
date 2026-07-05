import { computeRollup, splitTargetByHeadcount } from '../src/modules/rollup';

describe('rollup', () => {
  it('computes gap-to-min and percent-of-min per branch/rep', () => {
    const rollup = computeRollup({
      targets: [
        { market: 'salon-women', metric: 'confirmed-booking', locationId: 'salon_1', minPerDay: 50, maxPerDay: 60 },
        { market: 'salon-women', metric: 'confirmed-booking', locationId: 'salon_2', minPerDay: 40, maxPerDay: 50 },
      ],
      achievedByKey: { salon_1: 30, salon_2: 45 },
      locationNames: { salon_1: 'Salon 1', salon_2: 'Salon 2' },
    });

    expect(rollup).toHaveLength(2);
    expect(rollup[0]).toMatchObject({ locationId: 'salon_1', locationName: 'Salon 1', gapToMin: 20, percentOfMin: 60 });
    expect(rollup[1]).toMatchObject({ locationId: 'salon_2', locationName: 'Salon 2', gapToMin: 0, percentOfMin: 112.5 });
  });

  it('supports per-rep rollup via composite keys', () => {
    const rollup = computeRollup({
      targets: [
        { market: 'salon-women', metric: 'confirmed-booking', locationId: 'salon_1', repId: 'rep_a', minPerDay: 20 },
        { market: 'salon-women', metric: 'confirmed-booking', locationId: 'salon_1', repId: 'rep_b', minPerDay: 20 },
      ],
      achievedByKey: { 'salon_1:rep_a': 25, 'salon_1:rep_b': 5 },
    });

    expect(rollup.find((r) => r.repId === 'rep_a')?.gapToMin).toBe(0);
    expect(rollup.find((r) => r.repId === 'rep_b')?.gapToMin).toBe(15);
  });

  it('splits a market target across branches by staff headcount', () => {
    const targets = splitTargetByHeadcount({
      market: 'salon-women',
      metric: 'confirmed-booking',
      minPerDay: 100,
      maxPerDay: 120,
      locations: [
        { locationId: 'salon_1', staffCount: 3 },
        { locationId: 'salon_2', staffCount: 1 },
      ],
    });

    expect(targets.find((t) => t.locationId === 'salon_1')?.minPerDay).toBeCloseTo(75, 5);
    expect(targets.find((t) => t.locationId === 'salon_2')?.minPerDay).toBeCloseTo(25, 5);
  });

  it('splits evenly across locations when no headcount is available', () => {
    const targets = splitTargetByHeadcount({
      market: 'salon-women',
      metric: 'confirmed-booking',
      minPerDay: 100,
      locations: [
        { locationId: 'salon_1', staffCount: 0 },
        { locationId: 'salon_2', staffCount: 0 },
      ],
    });

    expect(targets.find((t) => t.locationId === 'salon_1')?.minPerDay).toBeCloseTo(50, 5);
    expect(targets.find((t) => t.locationId === 'salon_2')?.minPerDay).toBeCloseTo(50, 5);
  });
});
