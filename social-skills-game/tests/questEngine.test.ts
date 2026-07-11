import { QuestEngine } from '../src/modules/questEngine';

describe('QuestEngine', () => {
  it('tracks successful completions and derives a badge tier', () => {
    const engine = new QuestEngine();

    engine.recordAttempt('child_1', 'greet-and-introduce', 'success');
    let progress = engine.getProgress('child_1', 'greet-and-introduce');
    expect(progress?.successfulCompletions).toBe(1);
    expect(progress?.tier).toBe('bronze');

    engine.recordAttempt('child_1', 'greet-and-introduce', 'retry');
    progress = engine.getProgress('child_1', 'greet-and-introduce');
    // a retry does not count as a successful completion
    expect(progress?.successfulCompletions).toBe(1);

    engine.recordAttempt('child_1', 'greet-and-introduce', 'success');
    engine.recordAttempt('child_1', 'greet-and-introduce', 'success');
    progress = engine.getProgress('child_1', 'greet-and-introduce');
    expect(progress?.successfulCompletions).toBe(3);
    expect(progress?.tier).toBe('silver');
  });

  it('tracks progress per child independently', () => {
    const engine = new QuestEngine();
    engine.recordAttempt('child_1', 'active-listening', 'success');
    engine.recordAttempt('child_2', 'active-listening', 'success');
    engine.recordAttempt('child_2', 'active-listening', 'success');

    expect(engine.getProgress('child_1', 'active-listening')?.successfulCompletions).toBe(1);
    expect(engine.getProgress('child_2', 'active-listening')?.successfulCompletions).toBe(2);
  });

  it('lists all progress and attempts for a child', () => {
    const engine = new QuestEngine();
    engine.recordAttempt('child_1', 'skill-a', 'success');
    engine.recordAttempt('child_1', 'skill-b', 'skipped');

    expect(engine.progressForChild('child_1')).toHaveLength(2);
    expect(engine.attemptsForChild('child_1')).toHaveLength(2);
  });
});
