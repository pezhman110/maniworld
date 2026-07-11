import {
  ToolBuilderRegistry,
  InvalidToolTransitionError,
  ToolTierLimitExceededError,
  DEFAULT_TOOL_CATALOG,
} from '../src/modules/toolBuilder';

describe('ToolBuilderRegistry', () => {
  it('allows skipping tool-building entirely for a character', () => {
    const registry = new ToolBuilderRegistry();
    expect(registry.hasSkipped('character_1')).toBe(false);
    registry.skip('character_1');
    expect(registry.hasSkipped('character_1')).toBe(true);
    expect(registry.toolsFor('character_1')).toEqual([]);
  });

  it('exposes a varied catalog spanning multiple categories', () => {
    const categories = new Set(DEFAULT_TOOL_CATALOG.map((entry) => entry.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it('moves a tool through pending-generation -> generated -> approved (no-change)', () => {
    const registry = new ToolBuilderRegistry();
    const tool = registry.requestTool('character_1', 'weapon', 'a glowing blaster');
    expect(tool.status).toBe('pending-generation');

    registry.markGenerated(tool.id, 'asset://tool-1');
    const reviewed = registry.reviewTool(tool.id, 'no-change');
    expect(reviewed.status).toBe('approved');
  });

  it('sends a tool back for regeneration when the child asks for a change', () => {
    const registry = new ToolBuilderRegistry();
    const tool = registry.requestTool('character_1', 'shield', 'a round shield');
    registry.markGenerated(tool.id, 'asset://tool-1');

    const reviewed = registry.reviewTool(tool.id, 'with-change', 'make it bigger');
    expect(reviewed.status).toBe('pending-generation');
    expect(reviewed.revisionNotes).toEqual(['make it bigger']);

    registry.markGenerated(tool.id, 'asset://tool-2');
    const approved = registry.reviewTool(tool.id, 'no-change');
    expect(approved.status).toBe('approved');
  });

  it('rejects reviewing a tool before artwork has been generated', () => {
    const registry = new ToolBuilderRegistry();
    const tool = registry.requestTool('character_1', 'gadget', 'a gadget belt');
    expect(() => registry.reviewTool(tool.id, 'no-change')).toThrow(InvalidToolTransitionError);
  });

  it('caps the number of distinct tool categories in tier 1 (default 3)', () => {
    const registry = new ToolBuilderRegistry();
    registry.requestTool('character_1', 'weapon', 'blaster');
    registry.requestTool('character_1', 'shield', 'shield');
    registry.requestTool('character_1', 'gadget', 'gadget belt');
    expect(registry.remainingCategorySlots('character_1')).toBe(0);

    expect(() => registry.requestTool('character_1', 'vehicle', 'glider')).toThrow(ToolTierLimitExceededError);
  });

  it('allows multiple tools within an already-used category without hitting the cap', () => {
    const registry = new ToolBuilderRegistry();
    registry.requestTool('character_1', 'weapon', 'blaster');
    registry.requestTool('character_1', 'weapon', 'sword');
    expect(registry.remainingCategorySlots('character_1')).toBe(2);
    expect(registry.toolsFor('character_1')).toHaveLength(2);
  });

  it('only returns approved tools from approvedToolsFor', () => {
    const registry = new ToolBuilderRegistry();
    const tool = registry.requestTool('character_1', 'weapon', 'blaster');
    expect(registry.approvedToolsFor('character_1')).toEqual([]);

    registry.markGenerated(tool.id, 'asset://tool-1');
    registry.reviewTool(tool.id, 'no-change');
    expect(registry.approvedToolsFor('character_1')).toHaveLength(1);
  });
});
