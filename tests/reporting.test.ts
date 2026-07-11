import { FunnelTracker } from '../src/modules/funnelAutomation';
import { InteractionLog } from '../src/modules/interactionLog';
import { computeFunnelMetrics } from '../src/modules/reporting';

describe('reporting', () => {
  it('computes response, meeting, and booking rates across leads', () => {
    const funnel = new FunnelTracker();
    const log = new InteractionLog();

    // lead_1: responded, booked
    log.record({ leadId: 'lead_1', channel: 'whatsapp', type: 'message', direction: 'inbound', summary: 'yes', actor: 'lead_1' });
    funnel.transition('lead_1', 'contacted', 'agent_a', 1);
    funnel.transition('lead_1', 'qualified', 'agent_a', 2);
    funnel.transition('lead_1', 'meeting-scheduled', 'agent_a', 3);
    funnel.transition('lead_1', 'meeting-completed', 'agent_a', 4);
    funnel.transition('lead_1', 'booked', 'agent_a', 5);

    // lead_2: responded, only reached meeting-scheduled
    log.record({ leadId: 'lead_2', channel: 'telegram', type: 'message', direction: 'inbound', summary: 'ok', actor: 'lead_2' });
    funnel.transition('lead_2', 'contacted', 'agent_a', 1);
    funnel.transition('lead_2', 'meeting-scheduled', 'agent_a', 2);

    // lead_3: no response at all, stays new-lead
    const leadIds = ['lead_1', 'lead_2', 'lead_3'];
    const metrics = computeFunnelMetrics(leadIds, funnel, log, 300);

    expect(metrics.totalLeads).toBe(3);
    expect(metrics.responseRate).toBeCloseTo(2 / 3);
    expect(metrics.meetingRate).toBeCloseTo(2 / 3);
    expect(metrics.bookingRate).toBeCloseTo(1 / 3);
    expect(metrics.costPerLead).toBeCloseTo(100);
  });

  it('handles an empty lead list without dividing by zero', () => {
    const funnel = new FunnelTracker();
    const log = new InteractionLog();
    const metrics = computeFunnelMetrics([], funnel, log);
    expect(metrics.totalLeads).toBe(0);
    expect(metrics.responseRate).toBe(0);
  });
});
