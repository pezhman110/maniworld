import { resolveEffectiveTargets, TargetOverrideStore } from '../src/modules/targetOverrides';
import { DEFAULT_MARKET_TARGETS, findTargetRule } from '../src/modules/marketTargets';

describe('targetOverrides', () => {
  it('adds, updates and removes an override', () => {
    const store = new TargetOverrideStore();
    const override = store.add({
      market: 'salon-women',
      metric: 'confirmed-booking',
      period: 'daily',
      date: '2024-06-10',
      minPerDay: 120,
    });

    expect(store.get(override.id)).toMatchObject({ minPerDay: 120 });

    const updated = store.update(override.id, { minPerDay: 130 });
    expect(updated.minPerDay).toBe(130);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(override.createdAt);

    expect(store.remove(override.id)).toBe(true);
    expect(store.get(override.id)).toBeUndefined();
  });

  it('requires a date for daily overrides and a weekday for weekly overrides', () => {
    const store = new TargetOverrideStore();
    expect(() => store.add({ market: 'salon-women', metric: 'confirmed-booking', period: 'daily' })).toThrow(/date/);
    expect(() => store.add({ market: 'salon-women', metric: 'confirmed-booking', period: 'weekly' })).toThrow(/weekday/);
  });

  it('rejects negative min/max values', () => {
    const store = new TargetOverrideStore();
    expect(() =>
      store.add({ market: 'salon-women', metric: 'confirmed-booking', period: 'daily', date: '2024-06-10', minPerDay: -5 })
    ).toThrow();
  });

  it('a market-wide daily override replaces the base min/max for that date only', () => {
    const store = new TargetOverrideStore();
    store.add({
      market: 'salon-women',
      metric: 'confirmed-booking',
      period: 'daily',
      date: '2024-06-10',
      minPerDay: 150,
      maxPerDay: 180,
    });

    const overridden = resolveEffectiveTargets({ market: 'salon-women', isoDate: '2024-06-10', weekday: 1, store });
    expect(findTargetRule('salon-women', 'confirmed-booking', overridden)).toMatchObject({ minPerDay: 150, maxPerDay: 180 });

    // A different date is unaffected.
    const notOverridden = resolveEffectiveTargets({ market: 'salon-women', isoDate: '2024-06-11', weekday: 2, store });
    expect(findTargetRule('salon-women', 'confirmed-booking', notOverridden)).toMatchObject(
      findTargetRule('salon-women', 'confirmed-booking', DEFAULT_MARKET_TARGETS)!
    );
  });

  it('a weekly override applies every matching weekday, and a daily override wins over a weekly one', () => {
    const store = new TargetOverrideStore();
    store.add({ market: 'salon-women', metric: 'confirmed-booking', period: 'weekly', weekday: 5, minPerDay: 60 });
    store.add({ market: 'salon-women', metric: 'confirmed-booking', period: 'daily', date: '2024-06-14', minPerDay: 45 });

    const friday1 = resolveEffectiveTargets({ market: 'salon-women', isoDate: '2024-06-14', weekday: 5, store });
    expect(findTargetRule('salon-women', 'confirmed-booking', friday1)?.minPerDay).toBe(45); // daily wins

    const friday2 = resolveEffectiveTargets({ market: 'salon-women', isoDate: '2024-06-21', weekday: 5, store });
    expect(findTargetRule('salon-women', 'confirmed-booking', friday2)?.minPerDay).toBe(60); // weekly applies
  });
});
