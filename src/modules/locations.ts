import { Location, LocationKind, MarketType, WorkingHours } from '../types/domain';

/**
 * Locations module.
 *
 * Gives each market its own registry of physical locations:
 *  - salon-women can have any number of branches ("Salon 1" at address A,
 *    "Salon 2" at address B, ...);
 *  - home-service uses the availability window instead of a fixed branch;
 *  - the company (business-buying / business-selling / investment) currently
 *    runs from a single office with a fixed sales team size (30 sellers).
 *
 * Default working hours reflect the brief: 9:00-21:00 (9am-9pm) for the
 * office-based markets, and 10:00-22:00 (10am-10pm) for salon branches and
 * home-service availability.
 */

export const DEFAULT_WORKING_HOURS: Record<MarketType, WorkingHours> = {
  'salon-women': { startHour: 10, endHour: 22 },
  'home-service': { startHour: 10, endHour: 22 },
  'business-buying': { startHour: 9, endHour: 21 },
  'business-selling': { startHour: 9, endHour: 21 },
  investment: { startHour: 9, endHour: 21 },
};

export class DuplicateLocationError extends Error {
  constructor(id: string) {
    super(`Location "${id}" is already registered.`);
    this.name = 'DuplicateLocationError';
  }
}

export class LocationRegistry {
  private locations = new Map<string, Location>();
  private sequence = 0;

  /**
   * Registers a new location (salon branch or office). Working hours default
   * to the market's standard window when not supplied, so callers only need
   * to override them for exceptions.
   */
  register(params: {
    id?: string;
    kind: LocationKind;
    market: MarketType;
    name: string;
    address: string;
    workingHours?: WorkingHours;
    staffCount?: number;
    active?: boolean;
  }): Location {
    const { kind, market, name, address, workingHours, staffCount, active = true } = params;

    this.sequence += 1;
    const id = params.id ?? `location_${this.sequence}`;
    if (this.locations.has(id)) {
      throw new DuplicateLocationError(id);
    }

    const location: Location = {
      id,
      kind,
      market,
      name,
      address,
      workingHours: workingHours ?? DEFAULT_WORKING_HOURS[market],
      staffCount,
      active,
    };

    this.locations.set(id, location);
    return location;
  }

  get(id: string): Location | undefined {
    return this.locations.get(id);
  }

  deactivate(id: string): boolean {
    const location = this.locations.get(id);
    if (!location) return false;
    location.active = false;
    return true;
  }

  listByMarket(market: MarketType, onlyActive = true): Location[] {
    return [...this.locations.values()].filter(
      (l) => l.market === market && (!onlyActive || l.active)
    );
  }

  all(onlyActive = false): Location[] {
    return [...this.locations.values()].filter((l) => !onlyActive || l.active);
  }

  /** Total staff/sales headcount across active locations for a market. */
  totalStaffCount(market: MarketType): number {
    return this.listByMarket(market).reduce((sum, l) => sum + (l.staffCount ?? 0), 0);
  }

  /** Whether `hour` (0-23) falls within a location's working hours. */
  isOpenAtHour(id: string, hour: number): boolean {
    const location = this.locations.get(id);
    if (!location) return false;
    const { startHour, endHour } = location.workingHours;
    return hour >= startHour && hour < endHour;
  }
}
