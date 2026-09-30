/**
 * Pure rules for an option / question image slot that may have no picture.
 * Kept free of react-native imports so they run in plain node (see
 * src/components/practices/__tests__/OptionImage.tsx).
 */

/** A slot has a picture to try only when the resolved source is a non-blank string. */
export function hasImageSource(source: unknown): source is string {
  return typeof source === 'string' && source.trim().length > 0;
}

/**
 * The label shown (and announced) on the image-missing tile: the option's own
 * text when it has some, otherwise the localised generic string.
 */
export function placeholderLabel(
  text: string | null | undefined,
  fallback: string,
): string {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  return trimmed.length > 0 ? trimmed : fallback;
}

/** Whether the slot should show the placeholder instead of the picture. */
export function shouldShowPlaceholder(
  source: unknown,
  failedSource: string | null,
): boolean {
  return !hasImageSource(source) || failedSource === source;
}
