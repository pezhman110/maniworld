import { CreationTool, GuidedStep, GuidedStepProgress } from '../types/domain';

/**
 * Creation tools module.
 *
 * Kids don't get a blank, professional DAW — they get a small, curated set
 * of tools (beat, melody, effect, lyrics) plus an ordered list of guided
 * steps that walk them through building a song, one friendly prompt at a
 * time. Tools/steps are data (a registry) so new tools or a reordered
 * tutorial can be added without touching the progress-tracking engine.
 */
export const DEFAULT_CREATION_TOOLS: CreationTool[] = [
  {
    id: 'tool-beat-pads',
    kind: 'beat',
    label: 'Beat Pads',
    instruction: 'Tap the drum pads to build a beat you like!',
  },
  {
    id: 'tool-melody-keys',
    kind: 'melody',
    label: 'Melody Keys',
    instruction: 'Play the glowing keys to find a tune for your song.',
  },
  {
    id: 'tool-fun-effects',
    kind: 'effect',
    label: 'Fun Effects',
    instruction: 'Add a fun sound effect to make your song extra special.',
  },
  {
    id: 'tool-lyric-helper',
    kind: 'lyrics',
    label: 'Lyric Helper',
    instruction: 'Pick or write a few words for your part of the song.',
  },
];

export const DEFAULT_GUIDED_STEPS: GuidedStep[] = [
  { stepIndex: 0, toolId: 'tool-beat-pads', prompt: 'Step 1: Build a beat with the drum pads!' },
  { stepIndex: 1, toolId: 'tool-melody-keys', prompt: 'Step 2: Find a melody you like with the keys!' },
  { stepIndex: 2, toolId: 'tool-lyric-helper', prompt: 'Step 3: Choose the words for your part!' },
  { stepIndex: 3, toolId: 'tool-fun-effects', prompt: 'Step 4: Sprinkle in a fun sound effect!' },
];

export class UnknownGuidedStepError extends Error {
  constructor(stepIndex: number) {
    super(`No guided step configured for stepIndex ${stepIndex}.`);
    this.name = 'UnknownGuidedStepError';
  }
}

/**
 * Registry of tools + the ordered guided-step tutorial built from them, plus
 * per-participant, per-session progress tracking through those steps.
 */
export class CreationToolkitRegistry {
  private tools: CreationTool[];
  private steps: GuidedStep[];
  private completed: GuidedStepProgress[] = [];

  constructor(tools: CreationTool[] = DEFAULT_CREATION_TOOLS, steps: GuidedStep[] = DEFAULT_GUIDED_STEPS) {
    this.tools = [...tools];
    this.steps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
  }

  listTools(): CreationTool[] {
    return [...this.tools];
  }

  guidedSteps(): GuidedStep[] {
    return [...this.steps];
  }

  getStep(stepIndex: number): GuidedStep {
    const step = this.steps.find((entry) => entry.stepIndex === stepIndex);
    if (!step) {
      throw new UnknownGuidedStepError(stepIndex);
    }
    return step;
  }

  /** Records that a participant completed a guided step within a session. */
  completeStep(sessionId: string, participantId: string, stepIndex: number, completedAt: number = Date.now()): GuidedStepProgress {
    // Ensures the step exists (throws UnknownGuidedStepError otherwise).
    this.getStep(stepIndex);
    const progress: GuidedStepProgress = { sessionId, participantId, stepIndex, completedAt };
    this.completed.push(progress);
    return progress;
  }

  completedStepsFor(sessionId: string, participantId: string): GuidedStepProgress[] {
    return this.completed.filter((entry) => entry.sessionId === sessionId && entry.participantId === participantId);
  }

  /** Whether a participant has walked through every guided step for a session. */
  hasFinishedAllSteps(sessionId: string, participantId: string): boolean {
    const doneIndexes = new Set(this.completedStepsFor(sessionId, participantId).map((entry) => entry.stepIndex));
    return this.steps.every((step) => doneIndexes.has(step.stepIndex));
  }

  /** The next guided step a participant hasn't completed yet, or undefined if done. */
  nextStepFor(sessionId: string, participantId: string): GuidedStep | undefined {
    const doneIndexes = new Set(this.completedStepsFor(sessionId, participantId).map((entry) => entry.stepIndex));
    return this.steps.find((step) => !doneIndexes.has(step.stepIndex));
  }
}
