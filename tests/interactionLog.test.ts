import { InteractionLog } from '../src/modules/interactionLog';

describe('interactionLog', () => {
  it('records interactions and returns them sorted by time for a lead', () => {
    const log = new InteractionLog();
    log.record({ leadId: 'lead_1', channel: 'whatsapp', type: 'message', direction: 'outbound', summary: 'first contact', actor: 'agent_a', timestamp: 2000 });
    log.record({ leadId: 'lead_1', channel: 'whatsapp', type: 'message', direction: 'inbound', summary: 'reply', actor: 'lead_1', timestamp: 1000 });

    const entries = log.getByLead('lead_1');
    expect(entries[0].timestamp).toBe(1000);
    expect(entries[1].timestamp).toBe(2000);
  });

  it('detects whether a lead has responded inbound', () => {
    const log = new InteractionLog();
    log.record({ leadId: 'lead_1', channel: 'email', type: 'email', direction: 'outbound', summary: 'x', actor: 'agent_a' });
    expect(log.hasRespondedInbound('lead_1')).toBe(false);

    log.record({ leadId: 'lead_1', channel: 'email', type: 'email', direction: 'inbound', summary: 'y', actor: 'lead_1' });
    expect(log.hasRespondedInbound('lead_1')).toBe(true);
  });

  it('returns null for last contact time when there are no entries', () => {
    const log = new InteractionLog();
    expect(log.getLastContactTime('unknown-lead')).toBeNull();
  });

  it('filters entries by channel', () => {
    const log = new InteractionLog();
    log.record({ leadId: 'lead_1', channel: 'phone', type: 'call', direction: 'outbound', summary: 'call', actor: 'agent_a' });
    log.record({ leadId: 'lead_2', channel: 'in-person', type: 'in-person', direction: 'inbound', summary: 'walk-in', actor: 'front-desk' });
    expect(log.getByChannel('phone')).toHaveLength(1);
    expect(log.getByChannel('in-person')).toHaveLength(1);
  });
});
