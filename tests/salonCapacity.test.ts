import { Freelancer } from '../src/types/domain';
import {
  SalonCapacityRegistry,
  maxClientsPerWindow,
  daysNeededPerWeek,
  planFreelancerSchedule,
} from '../src/modules/salonCapacity';

describe('SalonCapacityRegistry and throughput math', () => {
  it('computes 5 clients in a 10-hour window at 2 hours/client (the brief example)', () => {
    const registry = new SalonCapacityRegistry();
    const capacity = registry.set({ locationId: 'salon_1', line: 'nails', minutesPerClient: 120 });

    expect(maxClientsPerWindow(capacity, 10)).toBe(5);
    expect(maxClientsPerWindow(capacity, 12)).toBe(6);
  });

  it('scales with parallel slots (chairs) at a salon', () => {
    const registry = new SalonCapacityRegistry();
    const capacity = registry.set({ locationId: 'salon_1', line: 'nails', minutesPerClient: 120, parallelSlots: 2 });
    expect(maxClientsPerWindow(capacity, 10)).toBe(10);
  });

  it('rejects non-positive minutesPerClient or parallelSlots', () => {
    const registry = new SalonCapacityRegistry();
    expect(() => registry.set({ locationId: 'salon_1', line: 'nails', minutesPerClient: 0 })).toThrow();
    expect(() => registry.set({ locationId: 'salon_1', line: 'nails', minutesPerClient: 60, parallelSlots: 0 })).toThrow();
  });

  it('needs 6 days/week to serve 30 clients at 5/day (the brief example)', () => {
    expect(daysNeededPerWeek(30, 5)).toBe(6);
    expect(daysNeededPerWeek(0, 5)).toBe(0);
    expect(daysNeededPerWeek(30, 0)).toBe(0);
    expect(daysNeededPerWeek(100, 5)).toBe(7); // capped at a full week
  });

  it('lists capacities by location and by line', () => {
    const registry = new SalonCapacityRegistry();
    registry.set({ locationId: 'salon_1', line: 'nails', minutesPerClient: 120 });
    registry.set({ locationId: 'salon_1', line: 'hair', minutesPerClient: 60 });
    registry.set({ locationId: 'salon_2', line: 'nails', minutesPerClient: 90 });

    expect(registry.listByLocation('salon_1')).toHaveLength(2);
    expect(registry.listByLine('nails')).toHaveLength(2);
  });
});

describe('planFreelancerSchedule', () => {
  function makeFreelancer(overrides: Partial<Freelancer> = {}): Freelancer {
    return {
      id: 'freelancer_1',
      fullName: 'Sara',
      phone: '+971500000000',
      line: 'nails',
      source: 'manual-list',
      availability: [],
      status: 'sourced',
      createdAt: 0,
      ...overrides,
    };
  }

  it('allocates the freelancer across salons/days to cover a 30-client weekly load', () => {
    const capacities = [
      { locationId: 'salon_1', line: 'nails', minutesPerClient: 120, parallelSlots: 1 },
      { locationId: 'salon_2', line: 'nails', minutesPerClient: 120, parallelSlots: 1 },
    ];
    const freelancer = makeFreelancer({
      clientCount: 30,
      availability: [
        { weekday: 0, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 1, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 2, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 3, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 4, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 5, startHour: 10, endHour: 20 }, // 5 clients
        { weekday: 6, startHour: 10, endHour: 14 }, // 2 clients (unused since already covered)
      ],
    });

    const plan = planFreelancerSchedule(freelancer, capacities);
    expect(plan.fullyCovered).toBe(true);
    expect(plan.uncoveredClientCount).toBe(0);
    expect(plan.allocations).toHaveLength(6);
    expect(plan.allocations.reduce((sum, a) => sum + a.clientsServed, 0)).toBeGreaterThanOrEqual(30);
  });

  it('reports an uncovered remainder when availability/capacity is insufficient', () => {
    const capacities = [{ locationId: 'salon_1', line: 'nails', minutesPerClient: 120, parallelSlots: 1 }];
    const freelancer = makeFreelancer({
      clientCount: 30,
      availability: [{ weekday: 0, startHour: 10, endHour: 20 }],
    });

    const plan = planFreelancerSchedule(freelancer, capacities);
    expect(plan.fullyCovered).toBe(false);
    expect(plan.uncoveredClientCount).toBe(25);
  });

  it('ignores capacities for a different line', () => {
    const capacities = [{ locationId: 'salon_1', line: 'hair', minutesPerClient: 60, parallelSlots: 1 }];
    const freelancer = makeFreelancer({
      clientCount: 10,
      availability: [{ weekday: 0, startHour: 10, endHour: 20 }],
    });

    const plan = planFreelancerSchedule(freelancer, capacities);
    expect(plan.allocations).toHaveLength(0);
    expect(plan.fullyCovered).toBe(false);
  });
});
