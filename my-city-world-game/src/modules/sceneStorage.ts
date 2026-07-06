import { LocaleString, MyCitySceneRecord, SceneNode } from '../types/domain';

/**
 * Scene Storage (plan block 12): the persistence contract matching the
 * `mycity_scenes` table (`id`, `user_id`, `title` JSONB, `scene` JSONB,
 * `thumb`, `created_at`) that a real Lovable Cloud / Postgres-backed
 * Server Function layer would implement with RLS. This module is an
 * in-memory stand-in exposing the same `saveScene` / `listScenes` /
 * `deleteScene` operations, matching the "registries model state
 * machines, not a real DB" convention used across sibling modules.
 */
export class SceneStorageRegistry {
  private records = new Map<string, MyCitySceneRecord>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `scene_${Date.now()}_${this.sequence}`;
  }

  saveScene(userId: string, title: LocaleString, scene: SceneNode[], thumb: string, createdAt: number = Date.now()): MyCitySceneRecord {
    const record: MyCitySceneRecord = {
      id: this.nextId(),
      user_id: userId,
      title,
      scene,
      thumb,
      created_at: createdAt,
    };
    this.records.set(record.id, record);
    return record;
  }

  listScenes(userId: string): MyCitySceneRecord[] {
    return [...this.records.values()]
      .filter((record) => record.user_id === userId)
      .sort((a, b) => b.created_at - a.created_at);
  }

  deleteScene(id: string): void {
    if (!this.records.delete(id)) {
      throw new Error(`Unknown mycity_scenes record id: ${id}`);
    }
  }

  getById(id: string): MyCitySceneRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new Error(`Unknown mycity_scenes record id: ${id}`);
    }
    return record;
  }
}
