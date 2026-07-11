import { MarketType, ServiceLine, WorkingHours } from '../types/domain';

/**
 * Service-line module.
 *
 * A branch (salon or home-service coverage area) can run several service
 * "lines" (e.g. Hair / Nails / Makeup) that each have their own hours
 * within the branch's overall opening window. This lets a manager say
 * exactly "Salon 1 → Nails line runs 12:00-20:00" without changing the
 * branch's own working hours.
 */

export class ServiceLineRegistry {
  private lines = new Map<string, ServiceLine>();
  private sequence = 0;

  register(params: {
    id?: string;
    locationId: string;
    market: MarketType;
    name: string;
    workingHours: WorkingHours;
    active?: boolean;
  }): ServiceLine {
    if (params.workingHours.endHour <= params.workingHours.startHour) {
      throw new Error(`Service line "${params.name}" has an invalid working-hours window.`);
    }

    this.sequence += 1;
    const line: ServiceLine = {
      id: params.id ?? `line_${this.sequence}`,
      locationId: params.locationId,
      market: params.market,
      name: params.name,
      workingHours: params.workingHours,
      active: params.active ?? true,
    };
    this.lines.set(line.id, line);
    return line;
  }

  update(id: string, patch: Partial<Pick<ServiceLine, 'name' | 'workingHours' | 'active'>>): ServiceLine {
    const existing = this.lines.get(id);
    if (!existing) throw new Error(`Service line "${id}" not found.`);
    if (patch.workingHours && patch.workingHours.endHour <= patch.workingHours.startHour) {
      throw new Error(`Service line "${id}" has an invalid working-hours window.`);
    }
    const updated: ServiceLine = { ...existing, ...patch };
    this.lines.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.lines.delete(id);
  }

  get(id: string): ServiceLine | undefined {
    return this.lines.get(id);
  }

  listByLocation(locationId: string, onlyActive = true): ServiceLine[] {
    return [...this.lines.values()].filter((l) => l.locationId === locationId && (!onlyActive || l.active));
  }

  listByMarket(market: MarketType, onlyActive = true): ServiceLine[] {
    return [...this.lines.values()].filter((l) => l.market === market && (!onlyActive || l.active));
  }

  isOpenAtHour(id: string, hour: number): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    return hour >= line.workingHours.startHour && hour < line.workingHours.endHour;
  }
}
