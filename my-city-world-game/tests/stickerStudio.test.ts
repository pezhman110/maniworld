import { StickerRegistry, fallbackEmojiKit, parseSceneDsl } from '../src/modules/stickerStudio';

describe('StickerRegistry', () => {
  it('follows the pending-generation -> generated -> approved lifecycle and lands in My Box', () => {
    const registry = new StickerRegistry();
    const sticker = registry.request('child_1', 'a happy golden retriever puppy');
    expect(sticker.status).toBe('pending-generation');

    registry.markGenerated(sticker.id, 'img_ref_1');
    expect(registry.getById(sticker.id).status).toBe('generated');

    registry.approve(sticker.id);
    expect(registry.getById(sticker.id).status).toBe('approved');
    expect(registry.myBox().map((s) => s.id)).toContain(sticker.id);
  });

  it('supports a needs-revision loop back to pending-generation', () => {
    const registry = new StickerRegistry();
    const sticker = registry.request('child_1', 'a red car');
    registry.markGenerated(sticker.id, 'img_ref');
    registry.requestRevision(sticker.id, 'make it blue instead');
    expect(registry.getById(sticker.id).status).toBe('needs-revision');
    registry.resubmitForGeneration(sticker.id);
    expect(registry.getById(sticker.id).status).toBe('pending-generation');
  });

  it('rejects invalid status transitions', () => {
    const registry = new StickerRegistry();
    const sticker = registry.request('child_1', 'a tree');
    expect(() => registry.approve(sticker.id)).toThrow();
  });

  it('provides a 6-icon fallback emoji kit', () => {
    expect(fallbackEmojiKit()).toHaveLength(6);
  });

  it('parses a sentence into a minimal Scene DSL fragment', () => {
    const dsl = parseSceneDsl('a blue bicycle');
    expect(dsl.item).toBe('a blue bicycle');
  });
});
