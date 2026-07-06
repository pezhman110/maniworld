import {
  DutyCheckIn,
  DutyPeriod,
  DutyQuota,
  DutyQuotaReading,
  DutyQuotaStatus,
  DutyScope,
  Prospect,
  WeeklyComplianceReport,
} from '../types/domain';

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

  private quotaReadings: DutyQuotaReading[] = [];
  private quotaReadingSequence = 0;

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
      /**
       * Contract-term headcount/relationship quotas, e.g. "at least 40
       * active clients" or "at least 30 bank experts in the network".
       */
      quotas?: DutyQuota[];
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
    const quotas = this.validateQuotas(params.quotas);

    this.scopeSequence += 1;
    const scope: DutyScope = {
      id: params.id ?? `duty_${this.scopeSequence}`,
      prospectId: prospect.id,
      locationId: params.locationId,
      visitsPerPeriod: params.visitsPerPeriod,
      period: params.period,
      servicesCovered: [...params.servicesCovered],
      commissionPercent: params.commissionPercent,
      quotas,
      notes: params.notes,
      definedAt: params.now ?? Date.now(),
      active: true,
    };
    this.scopes.set(scope.id, scope);
    return scope;
  }

  private validateQuotas(quotas: DutyQuota[] | undefined): DutyQuota[] | undefined {
    if (quotas === undefined) return undefined;
    if (!Array.isArray(quotas) || quotas.length === 0) return undefined;
    const seen = new Set<string>();
    return quotas.map((q) => {
      if (!q.metric || !q.metric.trim()) {
        throw new Error('Every quota must have a non-empty "metric" (e.g. "active-clients", "bank-experts-in-network").');
      }
      if (!Number.isFinite(q.minCount) || q.minCount <= 0) {
        throw new Error(`"minCount" for quota "${q.metric}" must be a positive number, got ${q.minCount}.`);
      }
      const metric = q.metric.trim();
      if (seen.has(metric)) {
        throw new Error(`Duplicate quota metric "${metric}".`);
      }
      seen.add(metric);
      return { metric, minCount: q.minCount };
    });
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

  /**
   * Records a fresh count against one of the duty scope's agreed
   * contract-term quotas, e.g. "42 active clients" or "31 bank experts in
   * the network". `metric` must match one of the quotas defined on the
   * scope.
   */
  recordQuotaReading(
    dutyScopeId: string,
    metric: string,
    count: number,
    params: { notes?: string; now?: number } = {}
  ): DutyQuotaReading {
    const scope = this.mustGet(dutyScopeId);
    const quota = (scope.quotas ?? []).find((q) => q.metric === metric);
    if (!quota) {
      throw new Error(`Duty scope "${dutyScopeId}" has no quota for metric "${metric}".`);
    }
    if (!Number.isFinite(count) || count < 0) {
      throw new Error(`"count" must be a non-negative number, got ${count}.`);
    }
    this.quotaReadingSequence += 1;
    const reading: DutyQuotaReading = {
      id: `quota_reading_${this.quotaReadingSequence}`,
      dutyScopeId,
      metric,
      count,
      recordedAt: params.now ?? Date.now(),
      notes: params.notes,
    };
    this.quotaReadings.push(reading);
    return reading;
  }

  listQuotaReadings(dutyScopeId: string, metric?: string): DutyQuotaReading[] {
    return this.quotaReadings.filter(
      (r) => r.dutyScopeId === dutyScopeId && (metric === undefined || r.metric === metric)
    );
  }

  /**
   * Compares each of the duty scope's agreed quotas (e.g. "at least 40
   * active clients", "at least 30 bank experts in the network") against its
   * most recently recorded reading, flagging any shortfall - the requested
   * "شرط قرارداد ... رعایت شود" control.
   */
  getQuotaStatuses(dutyScopeId: string): DutyQuotaStatus[] {
    const scope = this.mustGet(dutyScopeId);
    return (scope.quotas ?? []).map((quota) => {
      const readings = this.listQuotaReadings(dutyScopeId, quota.metric);
      const latest = readings.reduce<DutyQuotaReading | undefined>(
        (best, r) => (!best || r.recordedAt > best.recordedAt ? r : best),
        undefined
      );
      const currentCount = latest?.count ?? 0;
      const deficit = Math.max(0, quota.minCount - currentCount);
      return {
        metric: quota.metric,
        minCount: quota.minCount,
        currentCount,
        compliant: deficit === 0,
        deficit,
        lastRecordedAt: latest?.recordedAt,
      };
    });
  }

  /** Every active duty scope that has at least one quota currently falling short of its agreed minimum. */
  listNonCompliantQuotas(onlyActive = true): { dutyScopeId: string; prospectId: string; statuses: DutyQuotaStatus[] }[] {
    return this.all(onlyActive)
      .map((scope) => ({
        dutyScopeId: scope.id,
        prospectId: scope.prospectId,
        statuses: this.getQuotaStatuses(scope.id).filter((s) => !s.compliant),
      }))
      .filter((entry) => entry.statuses.length > 0);
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
