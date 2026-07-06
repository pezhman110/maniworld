import {
  CharacterTool,
  DEFAULT_TOOL_TIER_LIMIT,
  ToolCatalogEntry,
  ToolCategory,
  ToolRevisionChoice,
  ToolTierLimitConfig,
} from '../types/domain';

/**
 * Tool builder module (step 3).
 *
 * For each character the child may (optionally — this whole step can be
 * skipped) equip tools/gear. Each tool goes through the same AI-artwork
 * review cycle as the character concept, but with a lighter choice at the
 * end: "no-change" (keep the AI's first draft) or "with-change" (ask for a
 * revision, same as `requestRevision` elsewhere). The catalog spans several
 * distinct categories to keep the tool list varied, and the number of
 * *distinct categories* usable is capped in tier 1 (default 3, shown at the
 * top of the screen) — configurable so later tiers/upgrades can unlock more.
 */
export class UnknownToolError extends Error {
  constructor(toolId: string) {
    super(`Unknown character tool id: ${toolId}`);
    this.name = 'UnknownToolError';
  }
}

export class InvalidToolTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidToolTransitionError';
  }
}

export class ToolTierLimitExceededError extends Error {
  constructor(characterId: string, limit: number) {
    super(`Character ${characterId} already uses ${limit} distinct tool categories, the current tier-1 cap.`);
    this.name = 'ToolTierLimitExceededError';
  }
}

/** A deliberately varied catalog so tools don't all feel the same. */
export const DEFAULT_TOOL_CATALOG: ToolCatalogEntry[] = [
  { category: 'weapon', label: 'Blaster', description: 'A friendly energy blaster.' },
  { category: 'vehicle', label: 'Speed Glider', description: 'A vehicle that zips the hero around.' },
  { category: 'gadget', label: 'Gadget Belt', description: 'A belt full of clever little gadgets.' },
  { category: 'costume-accessory', label: 'Cape', description: 'A cape that adds flair and a bit of a boost.' },
  { category: 'shield', label: 'Shield', description: 'A shield that blocks incoming trouble.' },
  { category: 'pet-companion', label: 'Sidekick Pet', description: 'A small companion that helps out.' },
  { category: 'communicator', label: 'Wrist Communicator', description: 'A gadget for calling for help/teammates.' },
];

export class ToolBuilderRegistry {
  private tools = new Map<string, CharacterTool>();
  private skipped = new Set<string>();
  private sequence = 0;
  private readonly limitConfig: ToolTierLimitConfig;

  constructor(limitConfig: ToolTierLimitConfig = DEFAULT_TOOL_TIER_LIMIT) {
    this.limitConfig = limitConfig;
  }

  private nextId(): string {
    this.sequence += 1;
    return `tool_${Date.now()}_${this.sequence}`;
  }

  /** How many more distinct tool categories this character can still add (>= 0). */
  remainingCategorySlots(characterId: string): number {
    const usedCategories = new Set(this.toolsFor(characterId).map((tool) => tool.category));
    return Math.max(0, this.limitConfig.maxToolCategoriesInTier1 - usedCategories.size);
  }

  /** A child who doesn't want any tools for this character can skip the step entirely. */
  skip(characterId: string): void {
    this.skipped.add(characterId);
  }

  hasSkipped(characterId: string): boolean {
    return this.skipped.has(characterId);
  }

  requestTool(characterId: string, category: ToolCategory, description: string, createdAt: number = Date.now()): CharacterTool {
    const usedCategories = new Set(this.toolsFor(characterId).map((tool) => tool.category));
    if (!usedCategories.has(category) && usedCategories.size >= this.limitConfig.maxToolCategoriesInTier1) {
      throw new ToolTierLimitExceededError(characterId, this.limitConfig.maxToolCategoriesInTier1);
    }
    const tool: CharacterTool = {
      id: this.nextId(),
      characterId,
      category,
      description,
      status: 'pending-generation',
      revisionNotes: [],
      createdAt,
    };
    this.tools.set(tool.id, tool);
    return tool;
  }

  markGenerated(toolId: string, imageAssetRef: string): CharacterTool {
    const tool = this.getById(toolId);
    if (tool.status !== 'pending-generation') {
      throw new InvalidToolTransitionError(
        `Tool ${toolId} must be "pending-generation" before it can be marked generated (was "${tool.status}").`
      );
    }
    tool.status = 'generated';
    tool.imageAssetRef = imageAssetRef;
    return tool;
  }

  /** The child decides whether to keep the AI draft as-is or ask for a change. */
  reviewTool(toolId: string, choice: ToolRevisionChoice, note?: string): CharacterTool {
    const tool = this.getById(toolId);
    if (tool.status !== 'generated') {
      throw new InvalidToolTransitionError(
        `Tool ${toolId} must be "generated" before it can be reviewed (was "${tool.status}").`
      );
    }
    tool.revisionChoice = choice;
    if (choice === 'with-change') {
      if (note) {
        tool.revisionNotes.push(note);
      }
      tool.status = 'pending-generation';
    } else {
      tool.status = 'approved';
    }
    return tool;
  }

  getById(toolId: string): CharacterTool {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new UnknownToolError(toolId);
    }
    return tool;
  }

  toolsFor(characterId: string): CharacterTool[] {
    return [...this.tools.values()].filter((tool) => tool.characterId === characterId);
  }

  approvedToolsFor(characterId: string): CharacterTool[] {
    return this.toolsFor(characterId).filter((tool) => tool.status === 'approved');
  }
}
