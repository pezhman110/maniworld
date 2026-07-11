import { AgeBandId, AgeBandTransitionEvent, ChildProfile, ParentProgressReport } from '../types/domain';
import { AgeBandRegistry, computeAge } from './ageBands';
import { SkillRegistry } from './skills';
import { QuestEngine } from './questEngine';
import { completionsToNextTier } from './badges';

/**
 * Dashboard service.
 *
 * This is the piece the plan explicitly called out: whenever a child's
 * computed age has moved into a new age band, the dashboard must
 * automatically surface the next-level skill set plus a celebratory
 * transition message, and the parent report must reflect it.
 *
 * `lastKnownBandId` is tracked per child so a transition is only reported
 * once (the moment the band actually changes), rather than on every call.
 */
export class DashboardService {
  private lastKnownBandId = new Map<string, string>();

  constructor(
    private ageBands: AgeBandRegistry = new AgeBandRegistry(),
    private skills: SkillRegistry = new SkillRegistry(undefined, ageBands),
    private questEngine: QuestEngine = new QuestEngine()
  ) {}

  /**
   * Call this whenever a child opens the dashboard (or on a scheduled
   * check). Returns an `AgeBandTransitionEvent` only when the band just
   * changed since the last time this was called for that child; otherwise
   * returns undefined.
   */
  checkForAgeBandTransition(profile: ChildProfile, asOf: Date = new Date()): AgeBandTransitionEvent | undefined {
    const age = computeAge(profile.birthDate, asOf);
    const currentBand = this.ageBands.resolveForAge(age);
    const previousBandId = this.lastKnownBandId.get(profile.id) as AgeBandId | undefined;

    this.lastKnownBandId.set(profile.id, currentBand.id);

    // No transition to report on the very first check for a child (nothing to
    // compare against yet), nor when the band hasn't actually changed.
    if (previousBandId === undefined || previousBandId === currentBand.id) {
      return undefined;
    }

    const cumulativeSkills = this.skills.cumulativeForBand(currentBand.id);
    const previouslyUnlockedSkillIds = previousBandId
      ? new Set(this.skills.cumulativeForBand(previousBandId).map((s) => s.id))
      : new Set<string>();
    const newlyUnlockedSkillIds = cumulativeSkills
      .filter((skill) => !previouslyUnlockedSkillIds.has(skill.id))
      .map((skill) => skill.id);

    return {
      childId: profile.id,
      fromBandId: previousBandId,
      toBandId: currentBand.id,
      detectedAt: asOf.getTime(),
      newlyUnlockedSkillIds,
      message: currentBand.transitionMessage,
    };
  }

  /** The full cumulative skill list a child currently has unlocked, given their age. */
  unlockedSkillsFor(profile: ChildProfile, asOf: Date = new Date()) {
    const age = computeAge(profile.birthDate, asOf);
    const band = this.ageBands.resolveForAge(age);
    return this.skills.cumulativeForBand(band.id);
  }

  buildParentReport(profile: ChildProfile, asOf: Date = new Date()): ParentProgressReport {
    const age = computeAge(profile.birthDate, asOf);
    const band = this.ageBands.resolveForAge(age);
    const unlockedSkills = this.skills.cumulativeForBand(band.id);
    const progressEntries = this.questEngine.progressForChild(profile.id);
    const progressBySkillId = new Map(progressEntries.map((entry) => [entry.skillId, entry]));

    const skillsInProgress: ParentProgressReport['skillsInProgress'] = [];
    const skillsMastered: ParentProgressReport['skillsMastered'] = [];
    const homePracticeSuggestions: string[] = [];

    for (const skill of unlockedSkills) {
      const progress = progressBySkillId.get(skill.id);
      const completions = progress?.successfulCompletions ?? 0;
      if (progress?.tier === 'gold') {
        skillsMastered.push({ skillId: skill.id, title: skill.title });
      } else {
        skillsInProgress.push({
          skillId: skill.id,
          title: skill.title,
          tier: progress?.tier,
          completions,
        });
        const remaining = completionsToNextTier(completions);
        if (remaining !== undefined && remaining > 0) {
          homePracticeSuggestions.push(
            `Practice "${skill.title}" at home — ${remaining} more successful try${remaining === 1 ? '' : 'ies'} to level up.`
          );
        }
      }
    }

    return {
      childId: profile.id,
      generatedAt: asOf.getTime(),
      currentAgeBandId: band.id,
      skillsInProgress,
      skillsMastered,
      homePracticeSuggestions,
    };
  }

  get engine(): QuestEngine {
    return this.questEngine;
  }
}
