import {
  CharacterFinalizationRegistry,
  FinalizationNotDueError,
  UnknownFinalizationError,
} from '../src/modules/characterFinalization';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

describe('CharacterFinalizationRegistry', () => {
  it('starts a confirmation window when a character is closed', () => {
    const finalizations = new CharacterFinalizationRegistry({ confirmationWindowDays: 2 });
    const closedAt = 1_000_000;

    const record = finalizations.close('character_1', closedAt);
    expect(record.status).toBe('awaiting-confirmation');
    expect(record.confirmationDueAt).toBe(closedAt + 2 * ONE_DAY_MS);
    expect(finalizations.isConfirmationDue('character_1', closedAt)).toBe(false);
  });

  it('confirms the character final once the window has fully elapsed', () => {
    const finalizations = new CharacterFinalizationRegistry({ confirmationWindowDays: 2 });
    const closedAt = 1_000_000;
    finalizations.close('character_1', closedAt);

    const dueAt = closedAt + 2 * ONE_DAY_MS;
    expect(finalizations.isConfirmationDue('character_1', dueAt)).toBe(true);

    const confirmed = finalizations.confirm('character_1', dueAt);
    expect(confirmed.status).toBe('confirmed');
    expect(finalizations.isConfirmed('character_1')).toBe(true);
  });

  it('rejects confirming before the window has elapsed', () => {
    const finalizations = new CharacterFinalizationRegistry({ confirmationWindowDays: 2 });
    const closedAt = 1_000_000;
    finalizations.close('character_1', closedAt);

    expect(() => finalizations.confirm('character_1', closedAt + ONE_DAY_MS)).toThrow(FinalizationNotDueError);
  });

  it('reopens and restarts the confirmation window when the child asks for more changes', () => {
    const finalizations = new CharacterFinalizationRegistry({ confirmationWindowDays: 2 });
    const closedAt = 1_000_000;
    finalizations.close('character_1', closedAt);

    const reopenedAt = closedAt + ONE_DAY_MS;
    const reopened = finalizations.reopen('character_1', reopenedAt);
    expect(reopened.status).toBe('reopened');
    expect(reopened.reopenCount).toBe(1);
    expect(reopened.confirmationDueAt).toBe(reopenedAt + 2 * ONE_DAY_MS);

    // The original due date has passed, but the window was restarted on reopen.
    expect(finalizations.isConfirmationDue('character_1', closedAt + 2 * ONE_DAY_MS)).toBe(false);
    expect(finalizations.isConfirmationDue('character_1', reopenedAt + 2 * ONE_DAY_MS)).toBe(true);
  });

  it('throws for an unknown character id', () => {
    const finalizations = new CharacterFinalizationRegistry();
    expect(() => finalizations.getByCharacterId('missing')).toThrow(UnknownFinalizationError);
    expect(() => finalizations.confirm('missing')).toThrow(UnknownFinalizationError);
  });

  it('is not confirmed for a character that was never closed', () => {
    const finalizations = new CharacterFinalizationRegistry();
    expect(finalizations.isConfirmed('never_closed')).toBe(false);
  });
});
