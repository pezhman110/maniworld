import { RobotProgramRegistry } from '../src/modules/robotCoding';
import { RobotBlock } from '../src/types/domain';

describe('RobotProgramRegistry', () => {
  it('runs a simple sequence of blocks in order', () => {
    const registry = new RobotProgramRegistry();
    const blocks: RobotBlock[] = [
      { kind: 'go-to', argument: 'well' },
      { kind: 'pick-up', argument: 'water' },
      { kind: 'go-to', argument: 'park' },
      { kind: 'drop-off', argument: 'water' },
    ];
    const program = registry.createProgram({ childId: 'c1', cityId: 'city1', robotName: 'Blue', blocks });

    const result = registry.run(program.id);
    expect(result.succeeded).toBe(true);
    expect(result.steps).toHaveLength(4);
    expect(result.steps[1].outcome).toBe('Picked up water');
  });

  it('runs children of a repeat block the given number of times', () => {
    const registry = new RobotProgramRegistry();
    const blocks: RobotBlock[] = [
      {
        kind: 'repeat',
        argument: 3,
        children: [{ kind: 'help' }],
      },
    ];
    const program = registry.createProgram({ childId: 'c1', cityId: 'city1', robotName: 'Blue', blocks });

    const result = registry.run(program.id);
    const helpSteps = result.steps.filter((step) => step.block.kind === 'help');
    expect(helpSteps).toHaveLength(3);
  });

  it('skips if-block children when the condition check fails', () => {
    const registry = new RobotProgramRegistry();
    const blocks: RobotBlock[] = [
      {
        kind: 'if',
        children: [{ kind: 'help' }],
      },
    ];
    const program = registry.createProgram({ childId: 'c1', cityId: 'city1', robotName: 'Blue', blocks });

    const result = registry.run(program.id, () => false);
    expect(result.steps.some((step) => step.block.kind === 'help')).toBe(false);
    expect(result.steps[0].outcome).toBe('Condition not met, skipped');
  });

  it('runs if-block children when the condition check passes', () => {
    const registry = new RobotProgramRegistry();
    const blocks: RobotBlock[] = [
      {
        kind: 'if',
        children: [{ kind: 'help' }],
      },
    ];
    const program = registry.createProgram({ childId: 'c1', cityId: 'city1', robotName: 'Blue', blocks });

    const result = registry.run(program.id, () => true);
    expect(result.steps.some((step) => step.block.kind === 'help')).toBe(true);
  });
});
