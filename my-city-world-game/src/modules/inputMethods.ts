import { ArchiveStickerInput, ChildInput, TypedInput, VoiceInput, VoiceLocaleTag } from '../types/domain';

/**
 * Input Methods (plan block 1): a child chooses exactly one of three entry
 * routes — no preset canned buttons are ever shown.
 *  - Typed text, submitted via Enter or the "بساز" (Build) button
 *  - Voice, transcribed by the browser's STT in the app's current language
 *  - Archive sticker, picked from previously generated stickers ("My Box")
 */
export class InputMethodRegistry {
  private log: ChildInput[] = [];

  submitTyped(text: string, submittedVia: TypedInput['submittedVia']): TypedInput {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Typed input must not be empty.');
    }
    const input: TypedInput = { kind: 'typed', text: trimmed, submittedVia };
    this.log.push(input);
    return input;
  }

  submitVoice(transcript: string, locale: VoiceLocaleTag): VoiceInput {
    const trimmed = transcript.trim();
    if (!trimmed) {
      throw new Error('Voice transcript must not be empty.');
    }
    const input: VoiceInput = { kind: 'voice', transcript: trimmed, locale };
    this.log.push(input);
    return input;
  }

  submitArchiveSticker(stickerId: string): ArchiveStickerInput {
    if (!stickerId) {
      throw new Error('An archive sticker id is required.');
    }
    const input: ArchiveStickerInput = { kind: 'archive-sticker', stickerId };
    this.log.push(input);
    return input;
  }

  /** Extracts the free-text sentence to feed the Scene DSL parser from any input kind. */
  resolveSentence(input: ChildInput): string | undefined {
    if (input.kind === 'typed') {
      return input.text;
    }
    if (input.kind === 'voice') {
      return input.transcript;
    }
    return undefined;
  }

  history(): ChildInput[] {
    return [...this.log];
  }
}
