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

/**
 * How far outside a target (pt) the pointer may be and still land on it.
 * hitTarget's default repeats it as a literal: a worklet on the UI thread
 * can't see a module constant used in a default parameter (it crashed the
 * app on Android: "Property 'TARGET_SLOP' doesn't exist").
 */
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
export function hitTarget(p: Point, targets: TargetRects, slop: number = 12): string {
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
 * The pointer in the stage's frame during a drag: its position on screen,
 * less where the stage was on screen when the drag began, plus how far the
 * stage has since scrolled up under the pointer (shift; web only, where a
 * mouse wheel can scroll during a drag). Built on absolute positions, not
 * the pan's translation, which on Android starts counting only when a
 * long-press pan activates.
 */
export function pointerInStage(
  absolute: Point,
  stageOnScreen: Point,
  shift: Point = { x: 0, y: 0 },
): Point {
  'worklet';
  return {
    x: absolute.x - stageOnScreen.x + shift.x,
    y: absolute.y - stageOnScreen.y + shift.y,
  };
}

/** How long after a drag ends a press is still taken to be part of it (ms). */
export const PRESS_AFTER_DRAG_MS = 350;

/**
 * Until when presses are ignored, after a drag ends. A drag that moved past
 * the slop (it dropped somewhere, or nowhere) guards the next
 * PRESS_AFTER_DRAG_MS: on the web a mouse released over the item it was
 * pressed on also fires a click, and the click can arrive before the drop is
 * handled. A hold that never moved is a tap (the hold-tap already did what
 * the learner meant) and arms nothing, so a deliberate tap right after it
 * still counts. `until` is the guard in force before this drag ended.
 */
export function guardAfterDrag(until: number, moved: boolean, now: number): number {
  return moved ? Math.max(until, now + PRESS_AFTER_DRAG_MS) : until;
}

/** Whether a press must be ignored: a drag is on, or a moved drag just ended. */
export function pressBlocked(dragActive: boolean, guardUntil: number, now: number): boolean {
  return dragActive || now < guardUntil;
}
