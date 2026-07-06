import {
  ContentAccountKind,
  ContentBrief,
  ContentDestination,
  ContentItem,
  ContentItemStatus,
  ContentPlatform,
  ContentType,
  TrendNote,
} from '../types/domain';
import { InMemoryRepository, Repository } from './persistence';

/**
 * Content Studio module.
 *
 * Fully independent of the CRM outreach pipeline. Given a topic, a
 * reference style (to draw *inspiration* from, never to copy) and a
 * platform + personal/company account, this module:
 *
 *  1. Records trend notes a manager finds (from a platform's own official
 *     trend/discovery surface) so content generation can lean on them.
 *  2. Generates a bio/description for the brief.
 *  3. Generates a plan of content items (defaults to 9, matching the
 *     classic Instagram-grid convention) cycling through post/carousel/
 *     single-banner/video/audio/text types, each with a caption and a
 *     human-readable brief describing what the actual asset should show
 *     (this module only produces text-level plans, never real
 *     media/audio/video files).
 *  4. Every item also gets a "website" destination alongside its social
 *     platform, so the same content can be republished on the company
 *     site independently of what happens on social.
 *
 * Actually attempting to publish an item (and what happens when a
 * platform connection can't be reached) is handled by `socialPublisher.ts`,
 * which updates the `ContentDestination` records this module creates.
 */

function requireNonEmpty(value: string | undefined, field: string): string {
  if (!value || !value.trim()) throw new Error(`"${field}" is required.`);
  return value;
}

const DEFAULT_PLAN_TYPES: ContentType[] = [
  'post',
  'carousel',
  'single-banner',
  'video',
  'audio',
  'text',
];

function pickType(index: number): ContentType {
  return DEFAULT_PLAN_TYPES[index % DEFAULT_PLAN_TYPES.length];
}

function generateBio(topic: string, accountKind: ContentAccountKind, referenceStyle?: string): string {
  const voice = accountKind === 'company' ? 'Official page' : 'Personal page';
  const styleNote = referenceStyle ? ` | style inspired by ${referenceStyle}` : '';
  return `${voice} for ${topic}${styleNote}`;
}

function generateDescription(topic: string, trendKeywords: string[]): string {
  const trendNote = trendKeywords.length ? ` Trending now: ${trendKeywords.join(', ')}.` : '';
  return `Everything about ${topic}, updated regularly.${trendNote}`;
}

function generateCaption(topic: string, type: ContentType, index: number, trendKeywords: string[]): string {
  const trend = trendKeywords[index % Math.max(trendKeywords.length, 1)];
  const trendPart = trend ? ` Inspired by the "${trend}" trend.` : '';
  return `${topic} — ${type} #${index + 1}.${trendPart}`;
}

function generateMediaBrief(topic: string, type: ContentType): string {
  switch (type) {
    case 'carousel':
      return `Multi-slide carousel walking through ${topic}, one idea per slide.`;
    case 'single-banner':
      return `Single static banner summarizing ${topic} in one headline + visual.`;
    case 'video':
      return `Short-form video demonstrating ${topic}.`;
    case 'audio':
      return `Short audio/voice-over clip narrating ${topic}.`;
    case 'text':
      return `Text-only post/announcement about ${topic}.`;
    case 'post':
    default:
      return `Single-image post illustrating ${topic}.`;
  }
}

export class TrendResearchRegistry {
  constructor(private repo: Repository<TrendNote> = new InMemoryRepository()) {}

  async record(params: {
    id: string;
    platform: ContentPlatform;
    keyword: string;
    source: string;
    now?: number;
  }): Promise<TrendNote> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.keyword, 'keyword');
    requireNonEmpty(params.source, 'source');
    const note: TrendNote = {
      id: params.id,
      platform: params.platform,
      keyword: params.keyword,
      source: params.source,
      recordedAt: params.now ?? Date.now(),
    };
    await this.repo.save(note.id, note);
    return note;
  }

  async listForPlatform(platform: ContentPlatform): Promise<TrendNote[]> {
    const all = await this.repo.list();
    return all.filter((n) => n.platform === platform);
  }
}

export class ContentBriefRegistry {
  constructor(private repo: Repository<ContentBrief> = new InMemoryRepository()) {}

  async create(params: {
    id: string;
    platform: ContentPlatform;
    accountKind: ContentAccountKind;
    topic: string;
    referenceStyle?: string;
    trendKeywords?: string[];
    now?: number;
  }): Promise<ContentBrief> {
    requireNonEmpty(params.id, 'id');
    requireNonEmpty(params.topic, 'topic');
    if (await this.repo.getById(params.id)) {
      throw new Error(`A content brief with id "${params.id}" already exists.`);
    }
    const trendKeywords = params.trendKeywords ?? [];
    const brief: ContentBrief = {
      id: params.id,
      platform: params.platform,
      accountKind: params.accountKind,
      topic: params.topic,
      referenceStyle: params.referenceStyle,
      trendKeywords,
      bio: generateBio(params.topic, params.accountKind, params.referenceStyle),
      description: generateDescription(params.topic, trendKeywords),
      createdAt: params.now ?? Date.now(),
    };
    await this.repo.save(brief.id, brief);
    return brief;
  }

  async get(id: string): Promise<ContentBrief | undefined> {
    return this.repo.getById(id);
  }

  async list(): Promise<ContentBrief[]> {
    return this.repo.list();
  }
}

export class ContentPlanRegistry {
  constructor(private repo: Repository<ContentItem> = new InMemoryRepository()) {}

  /** Generates a content plan for a brief: `count` items (default 9) cycling through all content types. */
  async generatePlan(params: {
    brief: ContentBrief;
    count?: number;
    idPrefix: string;
    now?: number;
  }): Promise<ContentItem[]> {
    const count = params.count ?? 9;
    if (count < 1) throw new Error('"count" must be at least 1.');
    const now = params.now ?? Date.now();
    const items: ContentItem[] = [];
    for (let index = 0; index < count; index += 1) {
      const type = pickType(index);
      const destinations: ContentDestination[] = [
        { channel: params.brief.platform, status: 'draft' },
        { channel: 'website', status: 'draft' },
      ];
      const item: ContentItem = {
        id: `${params.idPrefix}-${index}`,
        briefId: params.brief.id,
        index,
        type,
        caption: generateCaption(params.brief.topic, type, index, params.brief.trendKeywords),
        mediaBrief: generateMediaBrief(params.brief.topic, type),
        destinations,
        createdAt: now,
      };
      await this.repo.save(item.id, item);
      items.push(item);
    }
    return items;
  }

  async get(id: string): Promise<ContentItem | undefined> {
    return this.repo.getById(id);
  }

  async listForBrief(briefId: string): Promise<ContentItem[]> {
    const all = await this.repo.list();
    return all.filter((i) => i.briefId === briefId).sort((a, b) => a.index - b.index);
  }

  async listFallbackQueue(): Promise<ContentItem[]> {
    const all = await this.repo.list();
    return all.filter((item) => item.destinations.some((d) => d.status === 'manual-fallback'));
  }

  /** Updates a single destination's status on an item (used after a publish attempt). */
  async updateDestination(
    itemId: string,
    channel: ContentDestination['channel'],
    patch: { status: ContentItemStatus; failureReason?: string; publishedAt?: number }
  ): Promise<ContentItem> {
    const item = await this.repo.getById(itemId);
    if (!item) throw new Error(`Content item "${itemId}" not found.`);
    const destinations = item.destinations.map((d) =>
      d.channel === channel
        ? { ...d, status: patch.status, failureReason: patch.failureReason, publishedAt: patch.publishedAt }
        : d
    );
    const updated: ContentItem = { ...item, destinations };
    await this.repo.save(itemId, updated);
    return updated;
  }
}
