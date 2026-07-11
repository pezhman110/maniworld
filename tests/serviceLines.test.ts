import { ServiceLineRegistry } from '../src/modules/serviceLines';

describe('serviceLines', () => {
  it('registers a per-branch service line with its own working hours', () => {
    const registry = new ServiceLineRegistry();
    const line = registry.register({
      locationId: 'salon_1',
      market: 'salon-women',
      name: 'Nails',
      workingHours: { startHour: 12, endHour: 20 },
    });

    expect(registry.isOpenAtHour(line.id, 13)).toBe(true);
    expect(registry.isOpenAtHour(line.id, 21)).toBe(false);
  });

  it('lists lines per branch and per market', () => {
    const registry = new ServiceLineRegistry();
    registry.register({ locationId: 'salon_1', market: 'salon-women', name: 'Hair', workingHours: { startHour: 10, endHour: 22 } });
    registry.register({ locationId: 'salon_1', market: 'salon-women', name: 'Nails', workingHours: { startHour: 12, endHour: 20 } });
    registry.register({ locationId: 'salon_2', market: 'salon-women', name: 'Hair', workingHours: { startHour: 10, endHour: 22 } });

    expect(registry.listByLocation('salon_1')).toHaveLength(2);
    expect(registry.listByMarket('salon-women')).toHaveLength(3);
  });

  it('updates and removes a line, and excludes inactive lines by default', () => {
    const registry = new ServiceLineRegistry();
    const line = registry.register({
      locationId: 'salon_1',
      market: 'salon-women',
      name: 'Makeup',
      workingHours: { startHour: 10, endHour: 22 },
    });

    registry.update(line.id, { active: false });
    expect(registry.listByLocation('salon_1')).toHaveLength(0);
    expect(registry.listByLocation('salon_1', false)).toHaveLength(1);

    expect(registry.remove(line.id)).toBe(true);
  });

  it('rejects an invalid working-hours window', () => {
    const registry = new ServiceLineRegistry();
    expect(() =>
      registry.register({ locationId: 'salon_1', market: 'salon-women', name: 'Bad', workingHours: { startHour: 20, endHour: 10 } })
    ).toThrow();
  });
});
