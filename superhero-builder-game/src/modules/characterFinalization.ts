import {
  CharacterFinalization,
  DEFAULT_FINALIZATION_WINDOW,
  FinalizationWindowConfig,
} from '../types/domain';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Character finalization module.
 *
 * A character is "closed" once the child finishes the habitat step (see
 * `habitat.ts` -> `decideWantsHabitat` returning `'character-closed'`, or
 * simply choosing to stop after tools). That alone doesn't make it final:
 * the product asks the child to sit with it for a configurable number of
 * days (default 2) before treating it as done. If the child comes back
 * during that window and asks for more changes, the window is reopened and
 * restarts from that moment. Once the window has fully elapsed without a
 * reopen, `confirm()` marks the character `confirmed` — this is the signal
 * `promoVideoStudio.ts` waits for before generating the 30-second promo
 * video.
 */
export class UnknownFinalizationError extends Error {
  constructor(characterId: string) {
    super(`No finalization record for character id: ${characterId}`);
    this.name = 'UnknownFinalizationError';
  }
}

export class FinalizationNotDueError extends Error {
  constructor(characterId: string, confirmationDueAt: number) {
    super(
      `Character ${characterId} cannot be confirmed final yet; the confirmation window is open until ${new Date(
        confirmationDueAt
      ).toISOString()}.`
    );
    this.name = 'FinalizationNotDueError';
  }
}

export class CharacterFinalizationRegistry {
  private records = new Map<string, CharacterFinalization>();
  private sequence = 0;
  private readonly windowConfig: FinalizationWindowConfig;

  constructor(windowConfig: FinalizationWindowConfig = DEFAULT_FINALIZATION_WINDOW) {
    this.windowConfig = windowConfig;
  }

  private nextId(): string {
    this.sequence += 1;
    return `finalization_${Date.now()}_${this.sequence}`;
  }

  private confirmationDueAt(closedAt: number): number {
    return closedAt + this.windowConfig.confirmationWindowDays * MS_PER_DAY;
  }

  /** Marks a character as closed out and starts (or restarts) the confirmation window. */
  close(characterId: string, closedAt: number = Date.now()): CharacterFinalization {
    const existing = this.records.get(characterId);
    if (existing) {
      existing.status = 'awaiting-confirmation';
      existing.closedAt = closedAt;
      existing.confirmationDueAt = this.confirmationDueAt(closedAt);
      return existing;
    }
    const record: CharacterFinalization = {
      id: this.nextId(),
      characterId,
      status: 'awaiting-confirmation',
      closedAt,
      confirmationDueAt: this.confirmationDueAt(closedAt),
      reopenCount: 0,
    };
    this.records.set(characterId, record);
    return record;
  }

  /** The child asked for more changes during the confirmation window; restarts the clock. */
  reopen(characterId: string, reopenedAt: number = Date.now()): CharacterFinalization {
    const record = this.getByCharacterId(characterId);
    record.status = 'reopened';
    record.reopenCount += 1;
    record.closedAt = reopenedAt;
    record.confirmationDueAt = this.confirmationDueAt(reopenedAt);
    return record;
  }

  /** True once `now` has reached the confirmation deadline and no reopen has happened since. */
  isConfirmationDue(characterId: string, now: number = Date.now()): boolean {
    const record = this.getByCharacterId(characterId);
    return record.status !== 'confirmed' && now >= record.confirmationDueAt;
  }

  /** Confirms the character as final once the window has elapsed with no further changes. */
  confirm(characterId: string, now: number = Date.now()): CharacterFinalization {
    const record = this.getByCharacterId(characterId);
    if (now < record.confirmationDueAt) {
      throw new FinalizationNotDueError(characterId, record.confirmationDueAt);
    }
    record.status = 'confirmed';
    record.confirmedAt = now;
    return record;
  }

  isConfirmed(characterId: string): boolean {
    return this.records.get(characterId)?.status === 'confirmed';
  }

  getByCharacterId(characterId: string): CharacterFinalization {
    const record = this.records.get(characterId);
    if (!record) {
      throw new UnknownFinalizationError(characterId);
    }
    return record;
  }
}
