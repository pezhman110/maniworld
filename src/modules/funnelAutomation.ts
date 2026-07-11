import { FunnelStage, FunnelSlaRule, FunnelEvent, AccountRole } from '../types/domain';

/**
 * Sales funnel automation module.
 *
 * Tracks a lead's progression through funnel stages, enforces SLA
 * (maximum time allowed in a stage before escalation), and produces a
 * full audit trail of stage transitions.
 */

const STAGE_ORDER: FunnelStage[] = [
  'new-lead',
  'contacted',
  'qualified',
  'meeting-scheduled',
  'meeting-completed',
  'booked',
];

export const DEFAULT_SLA_RULES: FunnelSlaRule[] = [
  { stage: 'new-lead', maxHoursInStage: 1, escalateToRole: 'responder' },
  { stage: 'contacted', maxHoursInStage: 24, escalateToRole: 'responder' },
  { stage: 'qualified', maxHoursInStage: 48, escalateToRole: 'owner' },
  { stage: 'meeting-scheduled', maxHoursInStage: 72, escalateToRole: 'owner' },
  { stage: 'meeting-completed', maxHoursInStage: 24, escalateToRole: 'owner' },
];

export class FunnelTracker {
  private currentStage = new Map<string, FunnelStage>();
  private events: FunnelEvent[] = [];
  private slaRules: FunnelSlaRule[];

  constructor(slaRules: FunnelSlaRule[] = DEFAULT_SLA_RULES) {
    this.slaRules = slaRules;
  }

  getStage(leadId: string): FunnelStage {
    return this.currentStage.get(leadId) ?? 'new-lead';
  }

  transition(leadId: string, toStage: FunnelStage, actor: string, timestamp: number = Date.now(), note?: string): FunnelEvent {
    const fromStage = this.currentStage.get(leadId) ?? null;

    if (fromStage && !this.isValidTransition(fromStage, toStage)) {
      throw new Error(`Invalid funnel transition from "${fromStage}" to "${toStage}" for lead ${leadId}`);
    }

    this.currentStage.set(leadId, toStage);
    const event: FunnelEvent = { leadId, fromStage, toStage, timestamp, actor, note };
    this.events.push(event);
    return event;
  }

  private isValidTransition(from: FunnelStage, to: FunnelStage): boolean {
    if (to === 'lost') return true; // A lead can be lost from any stage.
    const fromIndex = STAGE_ORDER.indexOf(from);
    const toIndex = STAGE_ORDER.indexOf(to);
    if (fromIndex === -1 || toIndex === -1) return false;
    // Allow forward moves only (no skipping backward), and allow re-entry into the same stage.
    return toIndex >= fromIndex;
  }

  getEvents(leadId: string): FunnelEvent[] {
    return this.events.filter((e) => e.leadId === leadId);
  }

  getLastTransitionTime(leadId: string): number | null {
    const leadEvents = this.getEvents(leadId);
    if (leadEvents.length === 0) return null;
    return leadEvents[leadEvents.length - 1].timestamp;
  }

  /** Returns leads whose current stage has exceeded its configured SLA, with the role to escalate to. */
  findSlaBreaches(now: number = Date.now()): Array<{ leadId: string; stage: FunnelStage; hoursOverdue: number; escalateToRole: AccountRole }> {
    const breaches: Array<{ leadId: string; stage: FunnelStage; hoursOverdue: number; escalateToRole: AccountRole }> = [];

    for (const [leadId, stage] of this.currentStage.entries()) {
      const rule = this.slaRules.find((r) => r.stage === stage);
      if (!rule) continue;

      const lastTransition = this.getLastTransitionTime(leadId);
      if (lastTransition === null) continue;

      const hoursInStage = (now - lastTransition) / (60 * 60 * 1000);
      if (hoursInStage > rule.maxHoursInStage) {
        breaches.push({
          leadId,
          stage,
          hoursOverdue: hoursInStage - rule.maxHoursInStage,
          escalateToRole: rule.escalateToRole,
        });
      }
    }

    return breaches;
  }
}
