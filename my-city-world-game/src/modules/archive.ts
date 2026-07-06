import { PersistenceTarget, SavedSceneArchiveEntry } from '../types/domain';

/**
 * Archive (plan block 9, "professional archive"): named saves of a scene,
 * searchable by title/tag, with JSON export/import for reuse. Notes the
 * intended persistence target (localStorage-first, then cloud-sync) but
 * does not perform real storage I/O itself — same "registries model state,
 * not real DB/localStorage wiring" boundary as sibling modules.
 */
export class SceneArchiveRegistry {
  private entries = new Map<string, SavedSceneArchiveEntry>();
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `archive_${Date.now()}_${this.sequence}`;
  }

  save(
    cityId: string,
    title: string,
    tags: string[],
    sceneJson: string,
    persistenceTarget: PersistenceTarget = 'local-storage',
    savedAt: number = Date.now()
  ): SavedSceneArchiveEntry {
    const entry: SavedSceneArchiveEntry = {
      id: this.nextId(),
      cityId,
      title,
      tags: [...tags],
      persistenceTarget,
      sceneJson,
      savedAt,
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  search(query: string): SavedSceneArchiveEntry[] {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return this.all();
    }
    return this.all().filter(
      (entry) => entry.title.toLowerCase().includes(needle) || entry.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  }

  all(): SavedSceneArchiveEntry[] {
    return [...this.entries.values()];
  }

  getById(id: string): SavedSceneArchiveEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Unknown archive entry id: ${id}`);
    }
    return entry;
  }

  exportScene(id: string): string {
    return this.getById(id).sceneJson;
  }

  importScene(cityId: string, title: string, tags: string[], sceneJson: string, persistenceTarget: PersistenceTarget = 'local-storage'): SavedSceneArchiveEntry {
    // Validate it is well-formed JSON before accepting the import.
    JSON.parse(sceneJson);
    return this.save(cityId, title, tags, sceneJson, persistenceTarget);
  }
}
