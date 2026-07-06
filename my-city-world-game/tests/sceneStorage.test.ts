import { SceneStorageRegistry } from '../src/modules/sceneStorage';

describe('SceneStorageRegistry', () => {
  it('saves and lists scenes for a user, most recent first', () => {
    const registry = new SceneStorageRegistry();
    registry.saveScene('user_1', { fa: 'a', ar: 'a', en: 'a' }, [], 'thumb1', 100);
    registry.saveScene('user_1', { fa: 'b', ar: 'b', en: 'b' }, [], 'thumb2', 200);
    const scenes = registry.listScenes('user_1');
    expect(scenes).toHaveLength(2);
    expect(scenes[0].created_at).toBe(200);
  });

  it('deletes a scene by id', () => {
    const registry = new SceneStorageRegistry();
    const record = registry.saveScene('user_1', { fa: 'a', ar: 'a', en: 'a' }, [], 'thumb1');
    registry.deleteScene(record.id);
    expect(() => registry.getById(record.id)).toThrow();
  });

  it('throws deleting an unknown scene id', () => {
    const registry = new SceneStorageRegistry();
    expect(() => registry.deleteScene('unknown')).toThrow();
  });
});
