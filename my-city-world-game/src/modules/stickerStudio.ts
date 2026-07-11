import { DEFAULT_FALLBACK_EMOJI_KIT, FallbackEmojiKit, SceneDslFragment, StickerRequest, StickerStatus } from '../types/domain';

/**
 * Sticker Studio (plan block 3): parses a child's sentence into a Scene DSL
 * fragment, then tracks the professional cartoon-sticker generation
 * lifecycle (pending-generation -> generated -> needs-revision -> approved).
 * Actual Gemini 3 Pro Image / Nano Banana calls are external — this module
 * only manages the request/response state machine, same boundary as the
 * image-generation steps in the sibling kids'-game modules.
 *
 * Also provides the 6-icon emoji fallback kit for a very young or impatient
 * child who doesn't want to wait for real image generation.
 */
const VALID_TRANSITIONS: Record<StickerStatus, StickerStatus[]> = {
  'pending-generation': ['generated', 'needs-revision'],
  generated: ['needs-revision', 'approved'],
  'needs-revision': ['pending-generation'],
  approved: [],
};

/** Very small heuristic parser: looks for simple markers a child's sentence might imply. Real NLU (Gemini) is external. */
export function parseSceneDsl(sentence: string): SceneDslFragment {
  return { item: sentence.trim() || undefined };
}

export class StickerRegistry {
  private stickers = new Map<string, StickerRequest>();
  private box: string[] = []; // "My Box" — approved sticker ids reusable across rooms.
  private sequence = 0;

  private nextId(): string {
    this.sequence += 1;
    return `sticker_${Date.now()}_${this.sequence}`;
  }

  request(childId: string, sourceSentence: string, dsl: SceneDslFragment = parseSceneDsl(sourceSentence), createdAt: number = Date.now()): StickerRequest {
    const sticker: StickerRequest = {
      id: this.nextId(),
      childId,
      sourceSentence,
      dsl,
      status: 'pending-generation',
      createdAt,
      updatedAt: createdAt,
    };
    this.stickers.set(sticker.id, sticker);
    return sticker;
  }

  markGenerated(stickerId: string, imageRef: string, updatedAt: number = Date.now()): StickerRequest {
    return this.transition(stickerId, 'generated', updatedAt, (sticker) => {
      sticker.imageRef = imageRef;
    });
  }

  requestRevision(stickerId: string, notes: string, updatedAt: number = Date.now()): StickerRequest {
    return this.transition(stickerId, 'needs-revision', updatedAt, (sticker) => {
      sticker.revisionNotes = notes;
    });
  }

  resubmitForGeneration(stickerId: string, updatedAt: number = Date.now()): StickerRequest {
    return this.transition(stickerId, 'pending-generation', updatedAt);
  }

  approve(stickerId: string, updatedAt: number = Date.now()): StickerRequest {
    const sticker = this.transition(stickerId, 'approved', updatedAt);
    if (!this.box.includes(sticker.id)) {
      this.box.push(sticker.id);
    }
    return sticker;
  }

  private transition(stickerId: string, next: StickerStatus, updatedAt: number, mutate?: (sticker: StickerRequest) => void): StickerRequest {
    const sticker = this.getById(stickerId);
    const allowed = VALID_TRANSITIONS[sticker.status];
    if (!allowed.includes(next)) {
      throw new Error(`Cannot move sticker ${stickerId} from '${sticker.status}' to '${next}'.`);
    }
    sticker.status = next;
    sticker.updatedAt = updatedAt;
    mutate?.(sticker);
    return sticker;
  }

  getById(stickerId: string): StickerRequest {
    const sticker = this.stickers.get(stickerId);
    if (!sticker) {
      throw new Error(`Unknown sticker request id: ${stickerId}`);
    }
    return sticker;
  }

  /** "My Box" — every approved sticker, reusable across any room in the city. */
  myBox(): StickerRequest[] {
    return this.box.map((id) => this.getById(id));
  }

  forChild(childId: string): StickerRequest[] {
    return [...this.stickers.values()].filter((sticker) => sticker.childId === childId);
  }
}

export function fallbackEmojiKit(): FallbackEmojiKit[] {
  return [...DEFAULT_FALLBACK_EMOJI_KIT];
}
