import { DuplicateLocationError, LocationRegistry, DEFAULT_WORKING_HOURS } from '../src/modules/locations';

describe('locations', () => {
  it('registers multiple salon branches under the same market with default working hours', () => {
    const registry = new LocationRegistry();
    const salon1 = registry.register({
      kind: 'salon-branch',
      market: 'salon-women',
      name: 'Salon 1',
      address: 'Address A',
    });
    const salon2 = registry.register({
      kind: 'salon-branch',
      market: 'salon-women',
      name: 'Salon 2',
      address: 'Address B',
    });

    expect(salon1.workingHours).toEqual(DEFAULT_WORKING_HOURS['salon-women']);
    expect(registry.listByMarket('salon-women')).toHaveLength(2);
    expect(registry.listByMarket('salon-women').map((l) => l.name)).toEqual(['Salon 1', 'Salon 2']);
    expect(salon2.id).not.toBe(salon1.id);
  });

  it('registers a single company office with a sales headcount', () => {
    const registry = new LocationRegistry();
    registry.register({
      id: 'office-main',
      kind: 'office',
      market: 'business-buying',
      name: 'Main Office',
      address: 'HQ address',
      staffCount: 30,
    });

    expect(registry.totalStaffCount('business-buying')).toBe(30);
    expect(registry.get('office-main')?.workingHours).toEqual(DEFAULT_WORKING_HOURS['business-buying']);
  });

  it('throws DuplicateLocationError when reusing an explicit id', () => {
    const registry = new LocationRegistry();
    registry.register({ id: 'dup', kind: 'salon-branch', market: 'salon-women', name: 'Salon A', address: 'A' });
    expect(() =>
      registry.register({ id: 'dup', kind: 'salon-branch', market: 'salon-women', name: 'Salon B', address: 'B' })
    ).toThrow(DuplicateLocationError);
  });

  it('deactivate excludes a location from active-only listings', () => {
    const registry = new LocationRegistry();
    const salon = registry.register({ kind: 'salon-branch', market: 'salon-women', name: 'Salon 1', address: 'A' });
    expect(registry.deactivate(salon.id)).toBe(true);
    expect(registry.listByMarket('salon-women')).toHaveLength(0);
    expect(registry.listByMarket('salon-women', false)).toHaveLength(1);
    expect(registry.deactivate('missing')).toBe(false);
  });

  it('checks whether an hour falls within working hours (10-22 for salon, 9-21 for office markets)', () => {
    const registry = new LocationRegistry();
    const salon = registry.register({ kind: 'salon-branch', market: 'salon-women', name: 'Salon 1', address: 'A' });
    expect(registry.isOpenAtHour(salon.id, 9)).toBe(false);
    expect(registry.isOpenAtHour(salon.id, 10)).toBe(true);
    expect(registry.isOpenAtHour(salon.id, 21)).toBe(true);
    expect(registry.isOpenAtHour(salon.id, 22)).toBe(false);
    expect(registry.isOpenAtHour('missing', 12)).toBe(false);
  });

  it('allows overriding working hours per location', () => {
    const registry = new LocationRegistry();
    const office = registry.register({
      kind: 'office',
      market: 'investment',
      name: 'Investment Desk',
      address: 'Somewhere',
      workingHours: { startHour: 8, endHour: 20 },
    });
    expect(office.workingHours).toEqual({ startHour: 8, endHour: 20 });
  });
});
