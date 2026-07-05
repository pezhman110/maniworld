import { FunnelTracker } from '../src/modules/funnelAutomation';

describe('funnelAutomation', () => {
  it('defaults a new lead to the "new-lead" stage', () => {
    const tracker = new FunnelTracker();
    expect(tracker.getStage('lead_1')).toBe('new-lead');
  });

  it('allows valid forward transitions and records events', () => {
    const tracker = new FunnelTracker();
    tracker.transition('lead_1', 'contacted', 'agent_a', 1000);
    tracker.transition('lead_1', 'qualified', 'agent_a', 2000);
    expect(tracker.getStage('lead_1')).toBe('qualified');
    expect(tracker.getEvents('lead_1')).toHaveLength(2);
  });

  it('allows transition to "lost" from any stage', () => {
    const tracker = new FunnelTracker();
    tracker.transition('lead_1', 'qualified', 'agent_a', 1000);
    expect(() => tracker.transition('lead_1', 'lost', 'agent_a', 2000)).not.toThrow();
    expect(tracker.getStage('lead_1')).toBe('lost');
  });

  it('rejects backward transitions', () => {
    const tracker = new FunnelTracker();
    tracker.transition('lead_1', 'qualified', 'agent_a', 1000);
    expect(() => tracker.transition('lead_1', 'contacted', 'agent_a', 2000)).toThrow(/Invalid funnel transition/);
  });

  it('detects SLA breaches once max hours in stage has passed', () => {
    const tracker = new FunnelTracker();
    const start = 0;
    tracker.transition('lead_1', 'contacted', 'agent_a', start);
    const now = start + 25 * 60 * 60 * 1000; // 25h later, SLA for 'contacted' is 24h
    const breaches = tracker.findSlaBreaches(now);
    expect(breaches).toHaveLength(1);
    expect(breaches[0].leadId).toBe('lead_1');
    expect(breaches[0].stage).toBe('contacted');
  });

  it('does not report a breach when still within SLA', () => {
    const tracker = new FunnelTracker();
    const start = 0;
    tracker.transition('lead_1', 'contacted', 'agent_a', start);
    const now = start + 1 * 60 * 60 * 1000;
    expect(tracker.findSlaBreaches(now)).toHaveLength(0);
  });
});
