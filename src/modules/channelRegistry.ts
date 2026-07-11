import { ChannelRegistryEntry, ChannelRegistryEntryType } from '../types/domain';

/**
 * Channel registry module.
 *
 * A manager-maintained, English-labeled list of extra sites/socials/ads
 * accounts to track, on top of whatever the system discovers
 * automatically. This is the concrete place to say "also watch this
 * Instagram page" or "also track this landing page" without waiting on an
 * automated crawler.
 */

export class ChannelRegistry {
  private entries = new Map<string, ChannelRegistryEntry>();
  private sequence = 0;

  add(params: { label: string; url: string; type: ChannelRegistryEntryType; addedBy: string; notes?: string; now?: number }): ChannelRegistryEntry {
    if (!params.label.trim()) throw new Error('"label" is required.');
    if (!/^https?:\/\//i.test(params.url)) {
      throw new Error(`"url" must be a valid http(s) URL, got "${params.url}".`);
    }

    this.sequence += 1;
    const entry: ChannelRegistryEntry = {
      id: `channel_${this.sequence}`,
      label: params.label.trim(),
      url: params.url,
      type: params.type,
      addedBy: params.addedBy,
      notes: params.notes,
      active: true,
      createdAt: params.now ?? Date.now(),
    };
    this.entries.set(entry.id, entry);
    return entry;
  }

  update(id: string, patch: Partial<Pick<ChannelRegistryEntry, 'label' | 'url' | 'type' | 'notes' | 'active'>>): ChannelRegistryEntry {
    const existing = this.entries.get(id);
    if (!existing) throw new Error(`Channel registry entry "${id}" not found.`);
    if (patch.url && !/^https?:\/\//i.test(patch.url)) {
      throw new Error(`"url" must be a valid http(s) URL, got "${patch.url}".`);
    }
    const updated: ChannelRegistryEntry = { ...existing, ...patch };
    this.entries.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.entries.delete(id);
  }

  deactivate(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    entry.active = false;
    return true;
  }

  get(id: string): ChannelRegistryEntry | undefined {
    return this.entries.get(id);
  }

  list(onlyActive = true): ChannelRegistryEntry[] {
    return [...this.entries.values()].filter((e) => !onlyActive || e.active);
  }

  byType(type: ChannelRegistryEntryType, onlyActive = true): ChannelRegistryEntry[] {
    return this.list(onlyActive).filter((e) => e.type === type);
  }
}
