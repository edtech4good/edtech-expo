/**
 * Returns an rgba() string from a `#RRGGBB` (or `#RGB`) hex color and a
 * 0–1 alpha value. Used to derive tint backgrounds (e.g. a success color at
 * 12% opacity) without ever hand-writing rgba literals at the call site.
 *
 * Inputs that are already `rgba(...)`/`rgb(...)` or an 8-digit hex
 * (`#RRGGBBAA`) are passed through unchanged — callers may hold theme
 * colors in either shape (see `shadow` tokens, which are already rgba or
 * 8-digit hex in some themes).
 */
export default function hexAlpha(hex: string, alpha: number): string {
  if (!hex) return hex;

  const normalized = hex.trim();

  // Already an rgba()/rgb() color — pass through as-is.
  if (normalized.startsWith('rgb')) return normalized;

  // 8-digit hex (#RRGGBBAA) already encodes its own alpha — pass through.
  if (/^#([0-9a-fA-F]{8})$/.test(normalized)) return normalized;

  const shortMatch = /^#([0-9a-fA-F]{3})$/.exec(normalized);
  const longMatch = /^#([0-9a-fA-F]{6})$/.exec(normalized);

  let r: number;
  let g: number;
  let b: number;

  if (longMatch) {
    const value = longMatch[1];
    r = parseInt(value.slice(0, 2), 16);
    g = parseInt(value.slice(2, 4), 16);
    b = parseInt(value.slice(4, 6), 16);
  } else if (shortMatch) {
    const value = shortMatch[1];
    r = parseInt(value[0] + value[0], 16);
    g = parseInt(value[1] + value[1], 16);
    b = parseInt(value[2] + value[2], 16);
  } else {
    // Unrecognized format — pass through gracefully rather than throwing.
    return normalized;
  }

  const clampedAlpha = Math.min(1, Math.max(0, alpha));

  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}
