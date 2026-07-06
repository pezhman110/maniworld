import { DesignTokenRef, ManiMascotDescriptor, MANI_LITTLE_ARCHITECT, rtlFor, SupportedLocale, TextDirection } from '../types/domain';

/**
 * Platform Rules (plan block 9): the 9 mandatory rules that apply to the
 * whole app, re-exposed here as small, testable helpers so "My Living
 * City" can be checked against them directly.
 *  1. Beauty via design tokens — never hardcoded colors.
 *  2. A dedicated Mani mascot for this module.
 *  3. Professional-quality photos/specs (delegated to stickerStudio.ts).
 *  4. Full trilingual i18n (fa/ar/en) with automatic RTL/LTR.
 *  5. The viral rule — Share button + public share page (shareLinks.ts).
 *  6. No blind ceilings — everything extensible (archive.ts, sceneTree.ts).
 *  7. Professional archive (archive.ts).
 *  8. Recording + auto-edit + destination-matched export (mediaOutputs.ts).
 *  9. Cross-posting to the app's own social surfaces (crossPosting.ts).
 */

/** Asserts a color/spacing value is a design-token reference, never a raw hex/rgb literal. */
export function assertUsesDesignToken(value: string | DesignTokenRef): DesignTokenRef {
  if (typeof value === 'string') {
    throw new Error(`Hardcoded style value "${value}" is not allowed; reference a design token instead.`);
  }
  return value;
}

export function mascotForMyCity(): ManiMascotDescriptor {
  return MANI_LITTLE_ARCHITECT;
}

export function directionFor(locale: SupportedLocale): TextDirection {
  return rtlFor(locale);
}
