import { MessageScript, ScriptStage, Channel } from '../types/domain';

/**
 * Message & call scripts module.
 *
 * Stores versioned scripts per (stage, channel) so multiple A/B variants
 * can run concurrently, and computes the next follow-up time based on
 * each stage's configured delay.
 */

export class MessageScriptLibrary {
  private scripts: MessageScript[] = [];
  private sequence = 0;

  addScript(script: Omit<MessageScript, 'id'>): MessageScript {
    this.sequence += 1;
    const full: MessageScript = { ...script, id: `script_${this.sequence}` };
    this.scripts.push(full);
    return full;
  }

  getActiveScripts(stage: ScriptStage, channel: Channel): MessageScript[] {
    return this.scripts.filter((s) => s.stage === stage && s.channel === channel && s.active);
  }

  /** Picks an A/B variant deterministically based on a seed (e.g. lead id) so the same lead always sees the same variant. */
  pickVariant(stage: ScriptStage, channel: Channel, seed: string): MessageScript | null {
    const candidates = this.getActiveScripts(stage, channel);
    if (candidates.length === 0) return null;
    const hash = hashString(seed);
    return candidates[hash % candidates.length];
  }

  deactivate(scriptId: string): void {
    const script = this.scripts.find((s) => s.id === scriptId);
    if (script) script.active = false;
  }

  bumpVersion(scriptId: string, newBody: string): MessageScript | null {
    const script = this.scripts.find((s) => s.id === scriptId);
    if (!script) return null;
    return this.addScript({
      stage: script.stage,
      channel: script.channel,
      version: script.version + 1,
      variantLabel: script.variantLabel,
      body: newBody,
      delayHoursFromPreviousStage: script.delayHoursFromPreviousStage,
      active: true,
    });
  }

  all(): MessageScript[] {
    return [...this.scripts];
  }
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function computeNextFollowUpTime(script: MessageScript, fromTimestamp: number): number {
  return fromTimestamp + script.delayHoursFromPreviousStage * 60 * 60 * 1000;
}

/** Seeds a default set of scripts covering the full contact cadence described in the requirements. */
export function buildDefaultScriptLibrary(): MessageScriptLibrary {
  const library = new MessageScriptLibrary();
  const channels: Channel[] = ['whatsapp', 'telegram', 'instagram', 'email', 'phone'];
  const stages: Array<{ stage: ScriptStage; delay: number }> = [
    { stage: 'first-contact', delay: 0 },
    { stage: 'follow-up-1', delay: 24 },
    { stage: 'follow-up-2', delay: 72 },
    { stage: 'qualification', delay: 4 },
    { stage: 'booking-offer', delay: 2 },
    { stage: 'reminder', delay: 24 },
    { stage: 'no-show-recovery', delay: 2 },
  ];

  for (const channel of channels) {
    for (const { stage, delay } of stages) {
      library.addScript({
        stage,
        channel,
        version: 1,
        variantLabel: 'A',
        body: `[${stage}] Hi {{firstName}}, this is a placeholder ${channel} script - customize per brand voice.`,
        delayHoursFromPreviousStage: delay,
        active: true,
      });
    }
  }

  return library;
}
