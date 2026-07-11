import { SceneArchiveRegistry } from '../src/modules/archive';

describe('SceneArchiveRegistry', () => {
  it('saves a named scene and finds it by title search', () => {
    const registry = new SceneArchiveRegistry();
    registry.save('city_1', 'My Dream Villa', ['villa', 'pool'], JSON.stringify({ nodes: [] }));
    expect(registry.search('villa')).toHaveLength(1);
    expect(registry.search('pool')).toHaveLength(1);
    expect(registry.search('nonexistent')).toHaveLength(0);
  });

  it('exports and re-imports a scene as JSON', () => {
    const registry = new SceneArchiveRegistry();
    const entry = registry.save('city_1', 'Backup', ['tag'], JSON.stringify({ a: 1 }));
    const exported = registry.exportScene(entry.id);
    const imported = registry.importScene('city_2', 'Restored', ['tag'], exported);
    expect(JSON.parse(imported.sceneJson)).toEqual({ a: 1 });
  });

  it('rejects importing malformed JSON', () => {
    const registry = new SceneArchiveRegistry();
    expect(() => registry.importScene('city_1', 'Bad', [], 'not-json')).toThrow();
  });

  it('defaults to local-storage persistence target', () => {
    const registry = new SceneArchiveRegistry();
    const entry = registry.save('city_1', 'Test', [], '{}');
    expect(entry.persistenceTarget).toBe('local-storage');
  });
});
