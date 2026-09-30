/**
 * Pure reorder logic behind ReorderableList (the corporate word-ordering and
 * picture-ordering drag primitive). No React, no React Native: everything
 * here runs in plain node under `yarn test:drag`.
 *
 * The functions that the drag gesture calls on every frame are marked
 * 'worklet' so Reanimated can run them on the UI thread. In node (and on
 * web, where Reanimated runs worklets on the JS thread) the directive is an
 * ordinary unused string.
 *
 * Vocabulary:
 * - an ORDER is the current array of item ids, in reading order;
 * - a RECT is a tile's frame in the list container's coordinates, measured
 *   with onLayout, indexed by the tile's position in the current order;
 * - a GAP is an insertion point between tiles: gap g sits before the tile at
 *   index g, and gap n (the length) sits after the last tile. Tiles do not
 *   reflow while a drag is in progress, so gaps are always in terms of the
 *   order as it was when the drag started.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Tiles whose tops differ by less than this share a line. */
export const LINE_TOLERANCE = 4;

/** Returns a copy of `order` with the item at `from` moved to index `to`. */
export function moveItem<T>(order: ReadonlyArray<T>, from: number, to: number): T[] {
  const next = order.slice();
  if (from < 0 || from >= next.length) return next;
  const clamped = Math.max(0, Math.min(next.length - 1, to));
  if (clamped === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamped, 0, item);
  return next;
}

/** Returns a copy of `order` with the items at `a` and `b` swapped. */
export function swapItems<T>(order: ReadonlyArray<T>, a: number, b: number): T[] {
  const next = order.slice();
  if (a === b || a < 0 || b < 0 || a >= next.length || b >= next.length) return next;
  const tmp = next[a];
  next[a] = next[b];
  next[b] = tmp;
  return next;
}

/**
 * The final index of the dragged item when it is dropped into `gap`.
 * Removing the item first shifts every later gap down by one.
 */
export function targetIndexForGap(from: number, gap: number): number {
  'worklet';
  return gap > from ? gap - 1 : gap;
}

/** Dropping into the gap directly before or after the item changes nothing. */
export function isNoopGap(from: number, gap: number): boolean {
  'worklet';
  return gap === from || gap === from + 1;
}

export interface InsertionTarget {
  /** The gap index (0..length), or -1 when there are no rects. */
  gap: number;
  /**
   * True when the pointer is past the last tile of its line. The gap after
   * the last tile of one line and the gap before the first tile of the next
   * are the same insertion, so this says which of the two places the caret
   * should be drawn: where the pointer is.
   */
  atLineEnd: boolean;
}

/**
 * The gap nearest to `p`, given the tiles' rects in reading order.
 *
 * Works for both layouts: tiles are grouped into lines by their top edge
 * (a wrapping inline row makes lines of different lengths; a grid makes
 * lines of `columns` tiles). The pointer's line is the one whose vertical
 * span contains it, or the nearest one when it is above, below or between
 * lines. Within that line the gap is before the first tile whose centre is
 * to the right of the pointer, or after the line's last tile.
 */
export function insertionTarget(p: Point, rects: ReadonlyArray<Rect>): InsertionTarget {
  'worklet';
  const n = rects.length;
  if (n === 0) return { gap: -1, atLineEnd: false };

  // Find the line whose vertical span is nearest the pointer.
  let bestStart = 0;
  let bestEnd = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  let start = 0;
  while (start < n) {
    let end = start;
    let top = rects[start].y;
    let bottom = rects[start].y + rects[start].height;
    while (end + 1 < n && Math.abs(rects[end + 1].y - rects[start].y) < LINE_TOLERANCE) {
      end += 1;
      top = Math.min(top, rects[end].y);
      bottom = Math.max(bottom, rects[end].y + rects[end].height);
    }
    const dist = p.y < top ? top - p.y : p.y > bottom ? p.y - bottom : 0;
    if (dist < bestDist) {
      bestDist = dist;
      bestStart = start;
      bestEnd = end;
    }
    start = end + 1;
  }

  for (let i = bestStart; i <= bestEnd; i += 1) {
    const r = rects[i];
    if (p.x < r.x + r.width / 2) return { gap: i, atLineEnd: false };
  }
  return { gap: bestEnd + 1, atLineEnd: true };
}

/** insertionTarget's gap alone. */
export function insertionGap(p: Point, rects: ReadonlyArray<Rect>): number {
  'worklet';
  return insertionTarget(p, rects).gap;
}

/**
 * Where to draw the vertical insertion caret: centred in the `gapX` space
 * before the tile at `gap`, or after the tile before it when the target is
 * at the end of a line (or the list). Returns null for an invalid gap.
 */
export function caretRect(
  target: InsertionTarget,
  rects: ReadonlyArray<Rect>,
  gapX: number,
  caretWidth: number,
): Rect | null {
  'worklet';
  const n = rects.length;
  const gap = target.gap;
  if (gap < 0 || gap > n || n === 0) return null;
  const anchorAfter = !target.atLineEnd && gap < n;
  if (anchorAfter) {
    const r = rects[gap];
    return { x: r.x - gapX / 2 - caretWidth / 2, y: r.y, width: caretWidth, height: r.height };
  }
  if (gap === 0) return null;
  const r = rects[gap - 1];
  return {
    x: r.x + r.width + gapX / 2 - caretWidth / 2,
    y: r.y,
    width: caretWidth,
    height: r.height,
  };
}

/** Grid columns for a container width: 2 across on phone, 4 on desktop. */
export const GRID_DESKTOP_MIN_WIDTH = 600;
export function gridColumns(containerWidth: number): number {
  return containerWidth >= GRID_DESKTOP_MIN_WIDTH ? 4 : 2;
}

/** Tile width for `columns` equal columns separated by `gap`. */
export function gridItemWidth(containerWidth: number, columns: number, gap: number): number {
  if (columns <= 0 || containerWidth <= 0) return 0;
  return Math.floor((containerWidth - gap * (columns - 1)) / columns);
}

// ---------------------------------------------------------------------------
// Screen-reader move actions and the keyboard.

export type MoveAction = 'moveEarlier' | 'moveLater' | 'moveToStart' | 'moveToEnd';

export const MOVE_ACTION_LABELS: Record<MoveAction, string> = {
  moveEarlier: 'Move earlier',
  moveLater: 'Move later',
  moveToStart: 'Move to start',
  moveToEnd: 'Move to end',
};

const MOVE_ACTIONS: MoveAction[] = ['moveEarlier', 'moveLater', 'moveToStart', 'moveToEnd'];

/** The index an action moves the item at `index` to, or null if it can't. */
export function moveActionTarget(action: MoveAction, index: number, length: number): number | null {
  if (index < 0 || index >= length) return null;
  let to: number;
  switch (action) {
    case 'moveEarlier':
      to = index - 1;
      break;
    case 'moveLater':
      to = index + 1;
      break;
    case 'moveToStart':
      to = 0;
      break;
    case 'moveToEnd':
      to = length - 1;
      break;
    default:
      return null;
  }
  if (to < 0 || to >= length || to === index) return null;
  return to;
}

/**
 * The move actions offered for the item at `index`. The first item has no
 * "Move earlier" or "Move to start", and the last has no "Move later" or
 * "Move to end", so a screen reader never lists an action that does nothing.
 */
export function availableMoveActions(index: number, length: number): MoveAction[] {
  return MOVE_ACTIONS.filter(a => moveActionTarget(a, index, length) !== null);
}

export type KeyResult =
  | { kind: 'tap' }
  | { kind: 'cancel' }
  | { kind: 'move'; to: number }
  | { kind: 'none' };

/**
 * Keyboard (web): Enter or Space acts like a tap (pick, swap, cancel).
 * While an item is picked, the arrow keys move it one place (Up and Down
 * move a whole row in a grid), Home and End move it to either end, and
 * Escape cancels the pick. Arrows do nothing unless the item is picked, so
 * Tab focus moves through the list without rearranging it.
 */
export function keyboardAction(
  key: string,
  index: number,
  length: number,
  isPicked: boolean,
  columns: number,
): KeyResult {
  if (key === 'Enter' || key === ' ' || key === 'Spacebar') return { kind: 'tap' };
  if (!isPicked) return { kind: 'none' };
  if (key === 'Escape') return { kind: 'cancel' };
  const rowStep = columns > 1 ? columns : 1;
  let to: number | null = null;
  switch (key) {
    case 'ArrowLeft':
      to = index - 1;
      break;
    case 'ArrowRight':
      to = index + 1;
      break;
    case 'ArrowUp':
      to = index - rowStep;
      break;
    case 'ArrowDown':
      to = index + rowStep;
      break;
    case 'Home':
      to = 0;
      break;
    case 'End':
      to = length - 1;
      break;
    default:
      return { kind: 'none' };
  }
  to = Math.max(0, Math.min(length - 1, to));
  return to === index ? { kind: 'none' } : { kind: 'move', to };
}

// ---------------------------------------------------------------------------
// Tap-to-swap.

export type TapEvent = 'picked' | 'cancelled' | 'swapped';

export interface TapResult<T> {
  picked: T | null;
  order: T[];
  event: TapEvent;
}

/**
 * Tap one item to pick it, tap another to swap the two, or tap the picked
 * one again to cancel. The same rule serves a finger tap, a screen reader's
 * double-tap and Enter/Space on the web.
 */
export function applyTap<T>(order: ReadonlyArray<T>, picked: T | null, tapped: T): TapResult<T> {
  if (picked === null || picked === undefined || order.indexOf(picked) < 0) {
    return { picked: tapped, order: order.slice(), event: 'picked' };
  }
  if (picked === tapped) {
    return { picked: null, order: order.slice(), event: 'cancelled' };
  }
  return {
    picked: null,
    order: swapItems(order, order.indexOf(picked), order.indexOf(tapped)),
    event: 'swapped',
  };
}

// ---------------------------------------------------------------------------
// Words for screen readers and the instruction line.

/** "Write. Word 3 of 6" */
export function itemAccessibilityLabel(label: string, noun: string, index: number, length: number): string {
  return `${label}. ${noun} ${index + 1} of ${length}`;
}

/** "Write moved to word 1. Write sale in book every your." */
export function moveAnnouncement(
  movedLabel: string,
  noun: string,
  to: number,
  labelsInNewOrder: ReadonlyArray<string>,
): string {
  return `${movedLabel} moved to ${noun.toLowerCase()} ${to + 1}. ${labelsInNewOrder.join(' ')}.`;
}

/** "Write and sale swapped. sale in Write book every your." */
export function swapAnnouncement(a: string, b: string, labelsInNewOrder: ReadonlyArray<string>): string {
  return `${a} and ${b} swapped. ${labelsInNewOrder.join(' ')}.`;
}

/**
 * The drop target in words, for the "Release to place it ..." line:
 * "before sale", "after your" (end of the list) or null when the drop
 * would change nothing.
 */
export function describeGap(
  from: number,
  gap: number,
  labels: ReadonlyArray<string>,
): string | null {
  if (gap < 0 || gap > labels.length || isNoopGap(from, gap)) return null;
  if (gap === labels.length) return `after “${labels[labels.length - 1]}”`;
  return `before “${labels[gap]}”`;
}
