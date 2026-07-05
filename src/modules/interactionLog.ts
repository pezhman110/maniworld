import { InteractionLogEntry, InteractionType, Channel } from '../types/domain';

/**
 * Unified interaction log module.
 *
 * A single append-only log for every touchpoint with a lead, whether
 * online (message/call/meeting/email) or offline (in-person, paper form),
 * so nothing falls through the cracks between channels.
 */

export class InteractionLog {
  private entries: InteractionLogEntry[] = [];
  private sequence = 0;

  record(params: {
    leadId: string;
    channel: Channel;
    type: InteractionType;
    direction: 'inbound' | 'outbound';
    summary: string;
    actor: string;
    timestamp?: number;
  }): InteractionLogEntry {
    this.sequence += 1;
    const entry: InteractionLogEntry = {
      id: `interaction_${this.sequence}`,
      leadId: params.leadId,
      channel: params.channel,
      type: params.type,
      direction: params.direction,
      timestamp: params.timestamp ?? Date.now(),
      summary: params.summary,
      actor: params.actor,
    };
    this.entries.push(entry);
    return entry;
  }

  getByLead(leadId: string): InteractionLogEntry[] {
    return this.entries
      .filter((e) => e.leadId === leadId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  getByChannel(channel: Channel): InteractionLogEntry[] {
    return this.entries.filter((e) => e.channel === channel);
  }

  getLastContactTime(leadId: string): number | null {
    const leadEntries = this.getByLead(leadId);
    if (leadEntries.length === 0) return null;
    return leadEntries[leadEntries.length - 1].timestamp;
  }

  hasRespondedInbound(leadId: string): boolean {
    return this.getByLead(leadId).some((e) => e.direction === 'inbound');
  }

  all(): InteractionLogEntry[] {
    return [...this.entries];
  }
}
