import { RobotBlock, RobotProgram, RobotRunResult, RobotRunStep } from '../types/domain';

/**
 * Visual Robot Coding module — drag-and-drop style blocks (go-to, pick-up,
 * drop-off, if, repeat, wait, help, return), mirroring ScratchJr-style
 * block programming for young kids. Execution here is simulated (no real
 * physics/animation, that's a client concern); this module models the
 * sequencing/conditional/loop semantics so the learning-engine goals
 * (sequencing, conditionals, loops, problem-solving) are testable.
 */
export class RobotProgramRegistry {
  private programs = new Map<string, RobotProgram>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `program_${Date.now()}_${this.sequence}`;
  }

  createProgram(input: {
    childId: string;
    cityId: string;
    robotName: string;
    blocks: RobotBlock[];
    createdAt?: number;
  }): RobotProgram {
    const program: RobotProgram = {
      id: this.nextId(),
      childId: input.childId,
      cityId: input.cityId,
      robotName: input.robotName,
      blocks: input.blocks,
      createdAt: input.createdAt ?? Date.now(),
    };
    this.programs.set(program.id, program);
    return program;
  }

  getById(programId: string): RobotProgram {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error(`Unknown robot program id: ${programId}`);
    }
    return program;
  }

  programsForChild(childId: string): RobotProgram[] {
    return [...this.programs.values()].filter((program) => program.childId === childId);
  }

  /**
   * Runs a program's blocks in order, simulating outcomes. `if` blocks run
   * their children only when `conditionCheck` (supplied by the caller,
   * default always-true) passes; `repeat` blocks run their children the
   * given number of times.
   */
  run(programId: string, conditionCheck: (block: RobotBlock) => boolean = () => true): RobotRunResult {
    const program = this.getById(programId);
    const steps: RobotRunStep[] = [];

    const execute = (blocks: RobotBlock[]): void => {
      for (const block of blocks) {
        switch (block.kind) {
          case 'go-to':
            steps.push({ block, outcome: `Moved to ${block.argument}` });
            break;
          case 'pick-up':
            steps.push({ block, outcome: `Picked up ${block.argument}` });
            break;
          case 'drop-off':
            steps.push({ block, outcome: `Dropped off ${block.argument}` });
            break;
          case 'wait':
            steps.push({ block, outcome: `Waited ${block.argument ?? 1}s` });
            break;
          case 'help':
            steps.push({ block, outcome: 'Helped a friend' });
            break;
          case 'return':
            steps.push({ block, outcome: 'Returned to base' });
            break;
          case 'if':
            if (conditionCheck(block)) {
              steps.push({ block, outcome: 'Condition met' });
              execute(block.children ?? []);
            } else {
              steps.push({ block, outcome: 'Condition not met, skipped' });
            }
            break;
          case 'repeat': {
            const times = typeof block.argument === 'number' ? block.argument : 1;
            for (let i = 0; i < times; i += 1) {
              execute(block.children ?? []);
            }
            steps.push({ block, outcome: `Repeated ${times} time(s)` });
            break;
          }
          default:
            throw new Error(`Unknown robot block kind: ${(block as RobotBlock).kind}`);
        }
      }
    };

    execute(program.blocks);

    return { programId, steps, succeeded: true };
  }
}
