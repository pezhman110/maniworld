import { FunnelMetrics } from '../types/domain';
import { InteractionLog } from './interactionLog';
import { FunnelTracker } from './funnelAutomation';

/**
 * Reporting & KPI module.
 *
 * Computes the funnel-level metrics called out in the requirements:
 * response rate, meeting rate, booking rate, and (optionally) cost per
 * lead / customer acquisition cost when ad spend figures are supplied.
 */

export function computeFunnelMetrics(
  leadIds: string[],
  funnel: FunnelTracker,
  interactionLog: InteractionLog,
  totalAdSpend?: number
): FunnelMetrics {
  const totalLeads = leadIds.length;

  if (totalLeads === 0) {
    return { totalLeads: 0, responseRate: 0, meetingRate: 0, bookingRate: 0, costPerLead: totalAdSpend };
  }

  const respondedCount = leadIds.filter((id) => interactionLog.hasRespondedInbound(id)).length;

  const meetingStages = new Set(['meeting-scheduled', 'meeting-completed', 'booked']);
  const meetingCount = leadIds.filter((id) => meetingStages.has(funnel.getStage(id))).length;

  const bookingCount = leadIds.filter((id) => funnel.getStage(id) === 'booked').length;

  return {
    totalLeads,
    responseRate: respondedCount / totalLeads,
    meetingRate: meetingCount / totalLeads,
    bookingRate: bookingCount / totalLeads,
    costPerLead: totalAdSpend !== undefined ? totalAdSpend / totalLeads : undefined,
  };
}
