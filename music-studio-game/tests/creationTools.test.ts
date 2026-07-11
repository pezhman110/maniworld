import { CreationToolkitRegistry, UnknownGuidedStepError } from '../src/modules/creationTools';

describe('CreationToolkitRegistry', () => {
  it('lists tools and guided steps in order', () => {
    const toolkit = new CreationToolkitRegistry();
    expect(toolkit.listTools().length).toBeGreaterThan(0);
    const steps = toolkit.guidedSteps();
    expect(steps.map((s) => s.stepIndex)).toEqual([0, 1, 2, 3]);
  });

  it('throws for an unknown step index', () => {
    const toolkit = new CreationToolkitRegistry();
    expect(() => toolkit.getStep(99)).toThrow(UnknownGuidedStepError);
  });

  it('tracks per-participant, per-session step completion', () => {
    const toolkit = new CreationToolkitRegistry();
    expect(toolkit.hasFinishedAllSteps('session_1', 'child_1')).toBe(false);
    expect(toolkit.nextStepFor('session_1', 'child_1')?.stepIndex).toBe(0);

    toolkit.completeStep('session_1', 'child_1', 0);
    expect(toolkit.nextStepFor('session_1', 'child_1')?.stepIndex).toBe(1);

    toolkit.completeStep('session_1', 'child_1', 1);
    toolkit.completeStep('session_1', 'child_1', 2);
    toolkit.completeStep('session_1', 'child_1', 3);

    expect(toolkit.hasFinishedAllSteps('session_1', 'child_1')).toBe(true);
    expect(toolkit.nextStepFor('session_1', 'child_1')).toBeUndefined();
  });

  it('keeps progress independent per participant within the same session', () => {
    const toolkit = new CreationToolkitRegistry();
    toolkit.completeStep('session_1', 'child_1', 0);
    expect(toolkit.completedStepsFor('session_1', 'child_2')).toHaveLength(0);
  });
});
