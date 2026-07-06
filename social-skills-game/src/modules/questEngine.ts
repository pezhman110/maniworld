import { QuestAttempt, QuestOutcome, SkillProgress } from '../types/domain';
import { tierForCompletions } from './badges';

/**
 * Quest engine module.
 *
 * Each skill is practiced through short "micro-story quests" (choose-your-path
 * mini stories) or interactive mini-games. This module doesn't render any of
 * that content — it owns the *progress bookkeeping*: recording quest
 * attempts and rolling them up into per-skill progress + badge tier.
 */
export class QuestEngine {
  private progress = new Map<string, SkillProgress>();
  private attempts: QuestAttempt[] = [];

  private key(childId: string, skillId: string): string {
    return `${childId}::${skillId}`;
  }

  /** Records the outcome of one quest attempt and updates the child's skill progress + tier. */
  recordAttempt(childId: string, skillId: string, outcome: QuestOutcome, playedAt: number = Date.now()): SkillProgress {
    this.attempts.push({ childId, skillId, outcome, playedAt });

    const key = this.key(childId, skillId);
    const existing = this.progress.get(key) ?? {
      childId,
      skillId,
      successfulCompletions: 0,
    };

    const successfulCompletions =
      outcome === 'success' ? existing.successfulCompletions + 1 : existing.successfulCompletions;

    const updated: SkillProgress = {
      ...existing,
      successfulCompletions,
      tier: tierForCompletions(successfulCompletions),
      lastPracticedAt: playedAt,
    };

    this.progress.set(key, updated);
    return updated;
  }

  getProgress(childId: string, skillId: string): SkillProgress | undefined {
    return this.progress.get(this.key(childId, skillId));
  }

  progressForChild(childId: string): SkillProgress[] {
    return [...this.progress.values()].filter((entry) => entry.childId === childId);
  }

  attemptsForChild(childId: string): QuestAttempt[] {
    return this.attempts.filter((attempt) => attempt.childId === childId);
  }
}
