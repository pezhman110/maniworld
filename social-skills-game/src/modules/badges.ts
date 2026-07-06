import { BadgeTier, BADGE_TIER_THRESHOLDS } from '../types/domain';

/**
 * Badge tier module.
 *
 * Pure lookup logic for turning a successful-completion count into a badge
 * tier (bronze/silver/gold), kept separate from the quest engine so tier
 * thresholds can be tuned without touching quest-attempt bookkeeping.
 */
export function tierForCompletions(successfulCompletions: number): BadgeTier | undefined {
  if (successfulCompletions >= BADGE_TIER_THRESHOLDS.gold) return 'gold';
  if (successfulCompletions >= BADGE_TIER_THRESHOLDS.silver) return 'silver';
  if (successfulCompletions >= BADGE_TIER_THRESHOLDS.bronze) return 'bronze';
  return undefined;
}

/** Completions still needed to reach the next tier, or undefined if already at gold (max tier). */
export function completionsToNextTier(successfulCompletions: number): number | undefined {
  const currentTier = tierForCompletions(successfulCompletions);
  if (currentTier === 'gold') return undefined;
  const nextThreshold = currentTier === 'silver' ? BADGE_TIER_THRESHOLDS.gold : BADGE_TIER_THRESHOLDS.silver;
  const effectiveNextThreshold = currentTier === undefined ? BADGE_TIER_THRESHOLDS.bronze : nextThreshold;
  return Math.max(effectiveNextThreshold - successfulCompletions, 0);
}
