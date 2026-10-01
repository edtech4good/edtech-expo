/**
 * Pure logic behind DragToTarget (drag a chip onto a slot): which drop
 * target is under the pointer, where the pointer is in the stage's frame,
 * and when a tap that follows a drag must be ignored. No React, no React
 * Native: everything here runs in plain node under `yarn test:drag`.
 *
 * Functions the gesture calls on every frame are marked 'worklet' so
 * Reanimated can run them on the UI thread (in node and on the web the
 * directive is an ordinary unused string).
 *
 * Every rect is in the DragStage's coordinates (measureLayout against the
 * stage), so scrolling the page does not move them; see DragToTarget.tsx.
 */
import type { Point, Rect } from './reorder';

/** Measured drop targets, by target id. */
export type TargetRects = Readonly<Record<string, Rect>>;

/** How far outside a target (pt) the pointer may be and still land on it. */
export const TARGET_SLOP = 12;

export function pointInRect(p: Point, r: Rect): boolean {
  'worklet';
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
}

/** Distance from a point to a rect (0 inside it). */
export function distanceToRect(p: Point, r: Rect): number {
  'worklet';
  const dx = p.x < r.x ? r.x - p.x : p.x > r.x + r.width ? p.x - (r.x + r.width) : 0;
  const dy = p.y < r.y ? r.y - p.y : p.y > r.y + r.height ? p.y - (r.y + r.height) : 0;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * The target under the pointer, or '' for none.
 * - Inside one or more targets: the smallest of them (a slot inside a
 *   bigger area wins over the area). Ties go to the first registered.
 * - Inside none: the nearest target within `slop`, so a small blank in a
 *   sentence is not missed by a few points.
 * Rects with no size (not measured yet) never match.
 */
export function hitTarget(p: Point, targets: TargetRects, slop: number = TARGET_SLOP): string {
  'worklet';
  let inside = '';
  let insideArea = Infinity;
  let near = '';
  let nearDist = Infinity;
  for (const id in targets) {
    const r = targets[id];
    if (!r || r.width <= 0 || r.height <= 0) continue;
    if (pointInRect(p, r)) {
      const area = r.width * r.height;
      if (area < insideArea) {
        inside = id;
        insideArea = area;
      }
    } else if (inside === '') {
      const d = distanceToRect(p, r);
      if (d <= slop && d < nearDist) {
        near = id;
        nearDist = d;
      }
    }
  }
  return inside !== '' ? inside : near;
}

/**
 * The pointer in the stage's frame during a drag: where the dragged item
 * was (origin), where on it the pointer went down (grab), how far the
 * pointer has moved (translation), plus how far the stage itself has
 * scrolled under the pointer since the drag began (shift; web only, where a
 * mouse wheel can scroll during a drag).
 */
export function pointerInStage(
  origin: Point,
  grab: Point,
  translation: Point,
  shift: Point = { x: 0, y: 0 },
): Point {
  'worklet';
  return {
    x: origin.x + grab.x + translation.x + shift.x,
    y: origin.y + grab.y + translation.y + shift.y,
  };
}

/** How long after a drag ends a press is still taken to be part of it (ms). */
export const PRESS_AFTER_DRAG_MS = 350;

/**
 * Whether a press must be ignored because it is the tail of a drag. On the
 * web a mouse released over the item it was pressed on also fires a click,
 * and the click can arrive before the drop is handled; a touch held past
 * the long-press time does the same. The drop (or the hold-tap) already did
 * what the gesture meant, so the press would act twice.
 */
export function pressBlocked(dragActive: boolean, lastDragEnd: number, now: number): boolean {
  return dragActive || now - lastDragEnd < PRESS_AFTER_DRAG_MS;
}
