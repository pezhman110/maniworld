import { MetricsStore } from '../src/modules/metricsStore';
import { InvalidNumericInputError } from '../src/modules/validation';

describe('metricsStore', () => {
  it('persists a value and returns it on read, surviving multiple reads (simulated reload)', () => {
    const store = new MetricsStore();
    store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', value: 42 });

    expect(store.get({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10' })).toBe(42);
    // Reading again ("reload") returns the same persisted value.
    expect(store.get({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10' })).toBe(42);
  });

  it('scopes values per branch/rep independently', () => {
    const store = new MetricsStore();
    store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', locationId: 'salon_1', value: 10 });
    store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', locationId: 'salon_2', value: 20 });

    expect(store.get({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', locationId: 'salon_1' })).toBe(10);
    expect(store.get({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', locationId: 'salon_2' })).toBe(20);
  });

  it('rejects negative values via input validation', () => {
    const store = new MetricsStore();
    expect(() => store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', value: -5 })).toThrow(
      InvalidNumericInputError
    );
  });

  it('lists entries by date and by market for building trend sparklines', () => {
    const store = new MetricsStore();
    store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-10', value: 90 });
    store.set({ market: 'salon-women', metric: 'confirmed-booking', date: '2024-06-11', value: 95 });
    store.set({ market: 'investment', metric: 'in-person-meeting', date: '2024-06-10', value: 70 });

    expect(store.listByDate('2024-06-10')).toHaveLength(2);
    expect(store.listByMarket('salon-women')).toHaveLength(2);
  });
});
