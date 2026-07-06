import { ComebackMessage, MemoryEvent } from '../types/domain';

/**
 * Retention engine module — deliberately avoids anxiety-inducing "day
 * streak" mechanics. Instead:
 *  - MemoryStreakRegistry counts memories created (not consecutive days),
 *    so missing a day never resets progress or creates loss-aversion guilt.
 *  - ComebackRegistry sends a warm, non-punitive nudge after inactivity
 *    ("your city misses you") rather than a guilt-trip or penalty.
 */
export class MemoryStreakRegistry {
  private memories: MemoryEvent[] = [];
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `memory_${Date.now()}_${this.sequence}`;
  }

  addMemory(childId: string, description: string, occurredAt: number = Date.now()): MemoryEvent {
    const memory: MemoryEvent = { id: this.nextId(), childId, description, occurredAt };
    this.memories.push(memory);
    return memory;
  }

  memoriesForChild(childId: string): MemoryEvent[] {
    return this.memories.filter((memory) => memory.childId === childId);
  }

  /** Total memories made so far — the only "count" surfaced to the child, never a fragile day-streak. */
  memoryCount(childId: string): number {
    return this.memoriesForChild(childId).length;
  }
}

const COMEBACK_MESSAGES = [
  'Your city misses you! Come see what your friends have been building.',
  'Your robots have been waiting patiently for new instructions!',
  "Your garden would love a visit — it's been thinking of you.",
];

export class ComebackRegistry {
  private messages: ComebackMessage[] = [];

  /** Triggers a kind comeback message if the child has been away longer than the threshold (default 3 days). */
  maybeTrigger(
    childId: string,
    lastActiveAt: number,
    now: number = Date.now(),
    inactivityThresholdMs: number = 3 * 24 * 60 * 60 * 1000
  ): ComebackMessage | undefined {
    if (now - lastActiveAt < inactivityThresholdMs) {
      return undefined;
    }
    const message = COMEBACK_MESSAGES[this.messages.length % COMEBACK_MESSAGES.length];
    const comeback: ComebackMessage = { childId, message, triggeredAt: now };
    this.messages.push(comeback);
    return comeback;
  }

  messagesForChild(childId: string): ComebackMessage[] {
    return this.messages.filter((message) => message.childId === childId);
  }
}
