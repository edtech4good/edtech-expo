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

export const ICON_SIZE = 24;
export const ICON_GAP = 8;

/**
 * How many label lines fit inside a tile of the given outer height: subtract
 * the border (both sides), the vertical padding (both sides) and, when shown,
 * the icon plus its gap. Always at least one.
 */
export function maxLabelLines(args: {
  height: number;
  borderWidth: number;
  padding: number;
  lineHeight: number;
  showIcon: boolean;
}): number {
  const { height, borderWidth, padding, lineHeight, showIcon } = args;
  const available =
    height -
    borderWidth * 2 -
    padding * 2 -
    (showIcon ? ICON_SIZE + ICON_GAP : 0);
  return Math.max(1, Math.floor(available / lineHeight));
}

/** Whether the slot should show the placeholder instead of the picture. */
export function shouldShowPlaceholder(
  source: unknown,
  failedSource: string | null,
): boolean {
  return !hasImageSource(source) || failedSource === source;
}
