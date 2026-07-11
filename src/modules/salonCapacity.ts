import {
  Freelancer,
  FreelancerCapacityPlan,
  FreelancerScheduleAllocation,
  SalonLineCapacity,
} from '../types/domain';

/**
 * Salon capacity planning module.
 *
 * Answers the sizing question directly from the brief: "لاین ناخن اگر کال
 * باشه ۲ ساعت هر مشتری زمان میبره پس در ۱۰ ساعت ۵ مشتری را ساپورت میکنی...
 * و اگر فریلنس ۳۰ تا مشتری داشته باشه باید ۶ روز در هفته" - i.e. given a
 * salon line's minutes-per-client and a freelancer's weekly client count,
 * compute how many clients/day the line supports and how many days/week
 * are needed, then allocate the freelancer's own free-time windows across
 * one or more salons to cover the full weekly load.
 */

export class SalonCapacityRegistry {
  private capacities = new Map<string, SalonLineCapacity>();

  private key(locationId: string, line: string): string {
    return `${locationId}::${line}`;
  }

  set(params: { locationId: string; line: string; minutesPerClient: number; parallelSlots?: number }): SalonLineCapacity {
    if (params.minutesPerClient <= 0) {
      throw new Error('"minutesPerClient" must be a positive number.');
    }
    const parallelSlots = params.parallelSlots ?? 1;
    if (parallelSlots <= 0) {
      throw new Error('"parallelSlots" must be a positive number.');
    }

    const capacity: SalonLineCapacity = {
      locationId: params.locationId,
      line: params.line,
      minutesPerClient: params.minutesPerClient,
      parallelSlots,
    };
    this.capacities.set(this.key(params.locationId, params.line), capacity);
    return capacity;
  }

  get(locationId: string, line: string): SalonLineCapacity | undefined {
    return this.capacities.get(this.key(locationId, line));
  }

  listByLocation(locationId: string): SalonLineCapacity[] {
    return [...this.capacities.values()].filter((c) => c.locationId === locationId);
  }

  listByLine(line: string): SalonLineCapacity[] {
    return [...this.capacities.values()].filter((c) => c.line === line);
  }
}

/** Max clients a line can support in one open window of `hours` length, e.g. 10 hours / 2h-per-client = 5. */
export function maxClientsPerWindow(capacity: SalonLineCapacity, hours: number): number {
  if (hours <= 0) return 0;
  const perSlot = Math.floor((hours * 60) / capacity.minutesPerClient);
  return perSlot * capacity.parallelSlots;
}

/**
 * How many days/week are needed to serve `clientCount` clients given a
 * fixed daily capacity, e.g. 30 clients / 5-per-day = 6 days. Capped at 7
 * (a week); returns 0 when there's nothing to schedule or no capacity at all.
 */
export function daysNeededPerWeek(clientCount: number, maxClientsPerDay: number): number {
  if (clientCount <= 0) return 0;
  if (maxClientsPerDay <= 0) return 0;
  return Math.min(7, Math.ceil(clientCount / maxClientsPerDay));
}

/**
 * Allocates a freelancer's weekly free-time windows across one or more
 * candidate salons' capacity for their line, greedily filling the largest
 * available windows first until the freelancer's weekly client count is
 * covered or availability/capacity runs out.
 */
export function planFreelancerSchedule(
  freelancer: Freelancer,
  capacities: SalonLineCapacity[],
  clientCount: number = freelancer.clientCount ?? 0
): FreelancerCapacityPlan {
  const relevant = capacities.filter((c) => c.line === freelancer.line);

  const candidates: FreelancerScheduleAllocation[] = [];
  for (const slot of freelancer.availability) {
    const hours = slot.endHour - slot.startHour;
    if (hours <= 0) continue;
    for (const capacity of relevant) {
      const clientsServed = maxClientsPerWindow(capacity, hours);
      if (clientsServed <= 0) continue;
      candidates.push({
        locationId: capacity.locationId,
        weekday: slot.weekday,
        startHour: slot.startHour,
        endHour: slot.endHour,
        clientsServed,
      });
    }
  }

  // Fill the highest-throughput windows first, one allocation per weekday
  // (a freelancer works one salon per day), until the weekly load is covered.
  candidates.sort((a, b) => b.clientsServed - a.clientsServed);

  const allocations: FreelancerScheduleAllocation[] = [];
  const usedWeekdays = new Set<number>();
  let remaining = clientCount;

  for (const candidate of candidates) {
    if (remaining <= 0) break;
    if (usedWeekdays.has(candidate.weekday)) continue;
    usedWeekdays.add(candidate.weekday);
    allocations.push(candidate);
    remaining -= candidate.clientsServed;
  }

  allocations.sort((a, b) => a.weekday - b.weekday);

  return {
    freelancerId: freelancer.id,
    clientCount,
    allocations,
    fullyCovered: remaining <= 0,
    uncoveredClientCount: Math.max(0, remaining),
  };
}
