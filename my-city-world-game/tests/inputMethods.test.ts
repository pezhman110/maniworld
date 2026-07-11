import { InputMethodRegistry } from '../src/modules/inputMethods';

describe('InputMethodRegistry', () => {
  it('accepts typed input via enter or build button', () => {
    const registry = new InputMethodRegistry();
    const typed = registry.submitTyped('a two-floor villa with a pool', 'enter-key');
    expect(typed.kind).toBe('typed');
    expect(typed.text).toBe('a two-floor villa with a pool');
    expect(registry.resolveSentence(typed)).toBe('a two-floor villa with a pool');
  });

  it('rejects empty typed input', () => {
    const registry = new InputMethodRegistry();
    expect(() => registry.submitTyped('   ', 'build-button')).toThrow();
  });

  it('accepts voice input tagged with the current locale', () => {
    const registry = new InputMethodRegistry();
    const voice = registry.submitVoice('یک خانهٔ ویلایی', 'fa-IR');
    expect(voice.locale).toBe('fa-IR');
    expect(registry.resolveSentence(voice)).toBe('یک خانهٔ ویلایی');
  });

  it('accepts an archive sticker pick and does not resolve a sentence for it', () => {
    const registry = new InputMethodRegistry();
    const archive = registry.submitArchiveSticker('sticker_1');
    expect(archive.stickerId).toBe('sticker_1');
    expect(registry.resolveSentence(archive)).toBeUndefined();
  });

  it('keeps a history of all submissions', () => {
    const registry = new InputMethodRegistry();
    registry.submitTyped('hello', 'enter-key');
    registry.submitArchiveSticker('s1');
    expect(registry.history()).toHaveLength(2);
  });
});
