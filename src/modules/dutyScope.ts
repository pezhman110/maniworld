import { DutyCheckIn, DutyPeriod, DutyScope, Prospect, WeeklyComplianceReport } from '../types/domain';

/**
 * Post-contract duty-scope module.
 *
 * Covers the requested "شرح وظیفه بعد از قرارداد": once a network partner's
 * contract has been sent (`Prospect.status === 'contract-sent'`) - whether
 * they were sourced as an influencer, through a banking network, or any
 * other channel - the responsible manager defines a concrete job
 * description (e.g. "visit 2 salons/day"), tied to the services/commission
 * they're compensated for. Actual visits are then logged and rolled up
 * into a weekly compliance report so under-performance against the agreed
 * cadence can be spotted and followed up on.
 */

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLIS_PER_WEEK = 7 * MILLIS_PER_DAY;

export class DutyScopeRegistry {
  private scopes = new Map<string, DutyScope>();
  private checkIns: DutyCheckIn[] = [];
  private scopeSequence = 0;
  private checkInSequence = 0;

  /** Defines the post-contract duty scope for a prospect whose contract has already been sent. */
  define(
    prospect: Prospect,
    params: {
      id?: string;
      locationId?: string;
      visitsPerPeriod: number;
      period: DutyPeriod;
      servicesCovered: string[];
      commissionPercent?: number;
      notes?: string;
      now?: number;
    }
  ): DutyScope {
    if (prospect.status !== 'contract-sent') {
      throw new Error(
        `A duty scope can only be defined after the contract has been sent (prospect "${prospect.id}" is "${prospect.status}").`
      );
    }
    if (!Number.isFinite(params.visitsPerPeriod) || params.visitsPerPeriod <= 0) {
      throw new Error('"visitsPerPeriod" must be a positive number.');
    }
    if (params.period !== 'day' && params.period !== 'week') {
      throw new Error(`"period" must be "day" or "week", got "${params.period}".`);
    }
    if (params.commissionPercent !== undefined) {
      if (!Number.isFinite(params.commissionPercent) || params.commissionPercent < 0 || params.commissionPercent > 100) {
        throw new Error(`"commissionPercent" must be a number between 0 and 100, got ${params.commissionPercent}.`);
      }
    }

    this.scopeSequence += 1;
    const scope: DutyScope = {
      id: params.id ?? `duty_${this.scopeSequence}`,
      prospectId: prospect.id,
      locationId: params.locationId,
      visitsPerPeriod: params.visitsPerPeriod,
      period: params.period,
      servicesCovered: [...params.servicesCovered],
      commissionPercent: params.commissionPercent,
      notes: params.notes,
      definedAt: params.now ?? Date.now(),
      active: true,
    };
    this.scopes.set(scope.id, scope);
    return scope;
  }

  get(id: string): DutyScope | undefined {
    return this.scopes.get(id);
  }

  listByProspect(prospectId: string): DutyScope[] {
    return [...this.scopes.values()].filter((s) => s.prospectId === prospectId);
  }

  all(onlyActive = true): DutyScope[] {
    return [...this.scopes.values()].filter((s) => !onlyActive || s.active);
  }

  deactivate(id: string): DutyScope {
    const scope = this.mustGet(id);
    scope.active = false;
    return scope;
  }

  /** Logs an actual visit/check-in against a duty scope. */
  recordCheckIn(dutyScopeId: string, checkedInAt: number = Date.now(), params: { locationId?: string; notes?: string } = {}): DutyCheckIn {
    this.mustGet(dutyScopeId);
    this.checkInSequence += 1;
    const checkIn: DutyCheckIn = {
      id: `checkin_${this.checkInSequence}`,
      dutyScopeId,
      checkedInAt,
      locationId: params.locationId,
      notes: params.notes,
    };
    this.checkIns.push(checkIn);
    return checkIn;
  }

  listCheckIns(dutyScopeId: string): DutyCheckIn[] {
    return this.checkIns.filter((c) => c.dutyScopeId === dutyScopeId);
  }

  /** How many visits are expected in a single week, given the duty scope's period. */
  expectedWeeklyVisits(scope: DutyScope): number {
    return scope.period === 'day' ? scope.visitsPerPeriod * 7 : scope.visitsPerPeriod;
  }

  /**
   * Rolls up actual check-ins for the 7-day window starting at `weekStart`
   * and compares them against the agreed cadence, flagging any deficit.
   */
  computeWeeklyCompliance(dutyScopeId: string, weekStart: number): WeeklyComplianceReport {
    const scope = this.mustGet(dutyScopeId);
    const weekEnd = weekStart + MILLIS_PER_WEEK;
    const actualVisits = this.checkIns.filter(
      (c) => c.dutyScopeId === dutyScopeId && c.checkedInAt >= weekStart && c.checkedInAt < weekEnd
    ).length;
    const expectedVisits = this.expectedWeeklyVisits(scope);
    const deficit = Math.max(0, expectedVisits - actualVisits);
    return {
      dutyScopeId,
      prospectId: scope.prospectId,
      weekStart,
      expectedVisits,
      actualVisits,
      compliant: deficit === 0,
      deficit,
    };
  }

  /** Weekly compliance reports for every active duty scope, for the manager's monitoring dashboard. */
  listWeeklyCompliance(weekStart: number, onlyActive = true): WeeklyComplianceReport[] {
    return this.all(onlyActive).map((scope) => this.computeWeeklyCompliance(scope.id, weekStart));
  }

  /** The subset of duty scopes currently falling short of their agreed weekly cadence. */
  listNonCompliant(weekStart: number): WeeklyComplianceReport[] {
    return this.listWeeklyCompliance(weekStart).filter((r) => !r.compliant);
  }

  private mustGet(id: string): DutyScope {
    const scope = this.scopes.get(id);
    if (!scope) throw new Error(`Duty scope "${id}" not found.`);
    return scope;
  }
}

/** Rounds a timestamp down to the start of its day, in UTC, as a convenience for weekStart computations. */
export function startOfDay(timestamp: number): number {
  return Math.floor(timestamp / MILLIS_PER_DAY) * MILLIS_PER_DAY;
}
