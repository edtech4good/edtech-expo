import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { LayoutChangeEvent, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { hitTarget, pointerInStage, pressBlocked, TargetRects } from './dropTarget';
import type { Rect } from './reorder';

/**
 * DragToTarget: drag a chip onto a slot. The drag primitive for the
 * corporate matching (template 7) and fill in the blank (template 8)
 * questions, built the way ReorderableList is (gesture-handler Pan +
 * Reanimated, owner token, measured rects).
 *
 * Three pieces, tied together by a controller from `useDragToTarget`:
 * - <DragStage>: the frame everything is measured in. It draws the lifted
 *   copy (from `renderLifted`) over its children while a drag is on.
 * - <Draggable id>: wraps a chip. It adds NO element a screen reader or the
 *   keyboard can reach: the chip inside stays the one control (a Pressable),
 *   and tapping it is still the tap path. Drag is pointer-only.
 *   While it is dragged, restyle what it wraps (opacity, an overlay for the
 *   ghost) but don't unmount or swap it: on the web gesture-handler follows
 *   the pointer through the element that was pressed, and if that element
 *   leaves the page the release is never seen and the drag never ends.
 * - <DropTarget id>: wraps a slot (or a whole area, like the bank) and
 *   registers its measured rect.
 *
 * Behaviour:
 * - Starting a drag: with a mouse on the web, any 8pt movement. With touch,
 *   a mostly-horizontal 8pt move, or a 250ms hold then any direction; a
 *   quick vertical swipe is left to the scroll view (on the web the browser
 *   pans: touch-action pan-y).
 * - While dragging: the lifted copy follows the pointer, the caller draws a
 *   dashed ghost where the chip came from (`controller.active.id`), and the
 *   target under the pointer is `controller.active.over` (draw it as hover).
 * - Dropping calls `onDrop(id, targetId | null)`; null means "not on a
 *   target" and the caller leaves things where they were.
 * - A hold that never moved is a slow tap: `onHoldTap(id)`. The chip's own
 *   press is cancelled by the gesture on native, and on the web the click
 *   that follows a drag is swallowed by `guardPress` (wrap the chip's and
 *   the slot's onPress with it).
 *
 * Rects are in the stage's frame (measureLayout against the stage), so a
 * scroll does not change them. They are re-measured on every registered
 * view's layout, on the stage's layout (rotation), on the web when the
 * stage resizes (ResizeObserver) or a font loads, and at the start of
 * every drag. On the web a wheel scroll during a drag is followed too.
 */

const DRAG_START_DISTANCE = 8;
const LONG_PRESS_MS = 250;

/** A touch screen on the web (see ReorderableList's note on the same check). */
const WEB_COARSE_POINTER =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

// Pan kinds, for the owner token (draggable number * PAN_KINDS + kind).
const PAN_MOUSE = 0;
const PAN_HORIZONTAL = 1;
const PAN_HELD = 2;
const PAN_KINDS = 3;

/**
 * Web: never disable a pan; a disabled draggable's pan starts and does
 * nothing instead. gesture-handler 2.14's web orchestrator, when a handler
 * is disabled while idle, removes it with splice(indexOf(h), 1); for a
 * handler it isn't tracking that is splice(-1, 1), which drops the LAST
 * tracked handler (the drag in progress) without resetting it. Every
 * re-render re-applies the configs, so a drop that disables any chip (a
 * placed chip's bank ghost, an emptied slot) left the dragged chip stuck
 * in END: its next press did nothing.
 */
const WEB_GATE = Platform.OS === 'web';

/** Where the lifted copy sits: keep the grab offset, or hang it from the pointer. */
export type LiftAnchor = 'origin' | 'pointer';
/** With anchor 'pointer', the lifted copy's top-left is this far up-left of the pointer. */
const POINTER_ANCHOR_OFFSET = 24;

export interface ActiveDrag {
  id: string;
  /** The target under the pointer, or null. */
  over: string | null;
}

interface DragValues {
  dragRects: SharedValue<TargetRects>;
  targetRects: SharedValue<TargetRects>;
  active: SharedValue<boolean>;
  anchor: SharedValue<number>; // 0 origin, 1 pointer
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  originW: SharedValue<number>;
  /** Where on the dragged view the pointer is (its own frame). */
  grabX: SharedValue<number>;
  grabY: SharedValue<number>;
  /** The stage's top-left on screen when the drag began. */
  stageAbsX: SharedValue<number>;
  stageAbsY: SharedValue<number>;
  /** The pointer in the stage's frame. */
  px: SharedValue<number>;
  py: SharedValue<number>;
  shiftX: SharedValue<number>;
  shiftY: SharedValue<number>;
  over: SharedValue<string>;
  /** Which pan of which draggable owns the drag in progress (-1: none). */
  owner: SharedValue<number>;
  /** Whether the pointer has moved past the slop since the drag began. */
  moved: SharedValue<boolean>;
}

export interface DragController {
  /** The drag in progress (for the ghost and the hover), or null. */
  active: ActiveDrag | null;
  /**
   * Wrap a chip's or slot's onPress: it does nothing while a drag is on or
   * just after one ends (the click a mouse release fires on the web).
   */
  guardPress: <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => void;
  /** @internal */
  _: Internals;
}

interface Internals {
  enabled: boolean;
  values: DragValues;
  stageRef: React.MutableRefObject<View | null>;
  register: (kind: 'drag' | 'target', id: string, node: View | null) => void;
  scheduleRemeasure: () => void;
  onStageLayout: () => void;
  begin: (id: string) => void;
  setOver: (id: string) => void;
  finish: (id: string, target: string, held: boolean) => void;
  nextToken: () => number;
  isDragging: () => boolean;
}

export interface UseDragToTargetOptions {
  /** A chip was dropped: on a target (its id) or on nothing (null). */
  onDrop: (id: string, target: string | null) => void;
  /** A press held still past the long-press time: treat it as a tap. */
  onHoldTap?: (id: string) => void;
  /** False turns every drag off (locked after Submit, Show answer). */
  enabled?: boolean;
}

export function useDragToTarget({
  onDrop,
  onHoldTap,
  enabled = true,
}: UseDragToTargetOptions): DragController {
  const [active, setActive] = useState<ActiveDrag | null>(null);

  const values: DragValues = {
    dragRects: useSharedValue<TargetRects>({}),
    targetRects: useSharedValue<TargetRects>({}),
    active: useSharedValue(false),
    anchor: useSharedValue(0),
    originX: useSharedValue(0),
    originY: useSharedValue(0),
    originW: useSharedValue(0),
    grabX: useSharedValue(0),
    grabY: useSharedValue(0),
    stageAbsX: useSharedValue(0),
    stageAbsY: useSharedValue(0),
    px: useSharedValue(0),
    py: useSharedValue(0),
    shiftX: useSharedValue(0),
    shiftY: useSharedValue(0),
    over: useSharedValue(''),
    owner: useSharedValue(-1),
    moved: useSharedValue(false),
  };
  const stable = useRef(values).current;

  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  const onHoldTapRef = useRef(onHoldTap);
  onHoldTapRef.current = onHoldTap;

  // ---- Measuring.
  const stageRef = useRef<View | null>(null);
  const nodes = useRef<{ drag: Record<string, View>; target: Record<string, View> }>({
    drag: {},
    target: {},
  });
  const rects = useRef<{ drag: Record<string, Rect>; target: Record<string, Rect> }>({
    drag: {},
    target: {},
  });
  const draggingIdRef = useRef<string | null>(null);

  const publish = useCallback(() => {
    stable.dragRects.value = { ...rects.current.drag };
    stable.targetRects.value = { ...rects.current.target };
  }, [stable]);

  const remeasure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    (['drag', 'target'] as const).forEach(kind => {
      Object.entries(nodes.current[kind]).forEach(([id, node]) => {
        node.measureLayout(
          stage,
          (x, y, width, height) => {
            // A node may have been unregistered while this was in flight.
            if (nodes.current[kind][id] !== node) return;
            rects.current[kind][id] = { x, y, width, height };
            if (kind === 'drag' && draggingIdRef.current === id) {
              // A drag that started on a stale rect: move its origin too.
              // Keep the pointer where the finger is: the stage's screen
              // position was worked out from the stale rect.
              stable.stageAbsX.value += stable.originX.value - x;
              stable.stageAbsY.value += stable.originY.value - y;
              stable.originX.value = x;
              stable.originY.value = y;
              stable.originW.value = width;
            }
            publish();
          },
          () => undefined,
        );
      });
    });
  }, [publish, stable]);

  // Coalesce bursts (every node's onLayout, font events) into one pass.
  const frame = useRef<number | null>(null);
  const scheduleRemeasure = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      remeasure();
    });
  }, [remeasure]);
  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const register = useCallback(
    (kind: 'drag' | 'target', id: string, node: View | null) => {
      if (node) nodes.current[kind][id] = node;
      else {
        delete nodes.current[kind][id];
        delete rects.current[kind][id];
        publish();
      }
      scheduleRemeasure();
    },
    [publish, scheduleRemeasure],
  );

  // Web: re-measure when the stage resizes and when a web font loads
  // (Khmer glyphs change widths).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const cleanups: Array<() => void> = [];
    const el = stageRef.current as unknown as Element | null;
    const RO = (window as unknown as { ResizeObserver?: typeof ResizeObserver }).ResizeObserver;
    if (el && RO) {
      const ro = new RO(() => scheduleRemeasure());
      ro.observe(el);
      cleanups.push(() => ro.disconnect());
    }
    const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
    if (fonts?.addEventListener) {
      const onFonts = () => scheduleRemeasure();
      fonts.addEventListener('loadingdone', onFonts);
      cleanups.push(() => fonts.removeEventListener('loadingdone', onFonts));
      fonts.ready?.then(onFonts).catch(() => undefined);
    }
    return () => cleanups.forEach(c => c());
  }, [scheduleRemeasure]);

  // ---- Web: follow a scroll during a drag (the stage moves under a still
  // pointer; rects are in the stage's frame, the pointer's travel is not).
  const stopScrollWatch = useRef<(() => void) | null>(null);
  const watchScroll = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const el = stageRef.current as unknown as HTMLElement | null;
    if (!el?.getBoundingClientRect) return;
    const start = el.getBoundingClientRect();
    const onScroll = () => {
      const now = el.getBoundingClientRect();
      stable.shiftX.value = start.left - now.left;
      stable.shiftY.value = start.top - now.top;
    };
    window.addEventListener('scroll', onScroll, true);
    stopScrollWatch.current = () => window.removeEventListener('scroll', onScroll, true);
  }, [stable]);
  useEffect(() => () => stopScrollWatch.current?.(), []);

  // ---- Drag lifecycle (JS side).
  const dragActive = useRef(false);
  const lastDragEnd = useRef(0);

  const begin = useCallback(
    (id: string) => {
      dragActive.current = true;
      draggingIdRef.current = id;
      setActive({ id, over: null });
      // Belt and braces for stale rects.
      remeasure();
      watchScroll();
    },
    [remeasure, watchScroll],
  );

  const setOver = useCallback((target: string) => {
    setActive(a => (a ? { ...a, over: target === '' ? null : target } : a));
  }, []);

  const finish = useCallback(
    (id: string, target: string, held: boolean) => {
      stopScrollWatch.current?.();
      stopScrollWatch.current = null;
      stable.active.value = false;
      stable.over.value = '';
      draggingIdRef.current = null;
      dragActive.current = false;
      lastDragEnd.current = Date.now();
      setActive(null);
      if (held) onHoldTapRef.current?.(id);
      else onDropRef.current(id, target === '' ? null : target);
    },
    [stable],
  );

  const guardPress = useCallback(
    <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (pressBlocked(dragActive.current, lastDragEnd.current, Date.now())) return;
        fn(...args);
      },
    [],
  );

  const tokenCounter = useRef(0);
  const nextToken = useCallback(() => {
    tokenCounter.current += 1;
    return tokenCounter.current;
  }, []);

  const onStageLayout = scheduleRemeasure;
  const isDragging = useCallback(() => dragActive.current, []);

  // A drag can't outlive `enabled` (Submit pressed mid-drag).
  useEffect(() => {
    if (!enabled && draggingIdRef.current) {
      stable.owner.value = -1;
      stable.active.value = false;
      draggingIdRef.current = null;
      dragActive.current = false;
      lastDragEnd.current = Date.now();
      setActive(null);
    }
  }, [enabled, stable]);

  const internals: Internals = {
    enabled,
    values: stable,
    stageRef,
    register,
    scheduleRemeasure,
    onStageLayout,
    begin,
    setOver,
    finish,
    nextToken,
    isDragging,
  };
  return { active, guardPress, _: internals };
}

const DragContext = createContext<Internals | null>(null);

function useInternals(): Internals {
  const c = useContext(DragContext);
  if (!c) throw new Error('Draggable and DropTarget must be inside a DragStage');
  return c;
}

/** Props that take a view and everything in it out of the accessibility tree. */
const HIDDEN_FROM_A11Y = {
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
  'aria-hidden': true,
} as const;

export interface DragStageProps {
  controller: DragController;
  /** The copy that follows the pointer (drawn without any controls). */
  renderLifted: (id: string) => ReactNode;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}

export function DragStage({ controller, renderLifted, style, children, testID }: DragStageProps) {
  const c = controller._;
  const v = c.values;

  const liftedStyle = useAnimatedStyle(() => {
    if (!v.active.value) return { opacity: 0, left: 0, top: 0 };
    if (v.anchor.value === 1) {
      return {
        opacity: 1,
        left: v.px.value - POINTER_ANCHOR_OFFSET,
        top: v.py.value - POINTER_ANCHOR_OFFSET,
      };
    }
    // The copy keeps the pointer where it was on the chip.
    return {
      opacity: 1,
      left: v.px.value - v.grabX.value,
      top: v.py.value - v.grabY.value,
      minWidth: v.originW.value,
    };
  });

  const activeId = controller.active?.id ?? null;

  return (
    <DragContext.Provider value={c}>
      <View
        ref={c.stageRef}
        collapsable={false}
        testID={testID}
        onLayout={c.onStageLayout}
        style={[style, styles.stage]}>
        {children}
        {activeId !== null ? (
          <Animated.View
            pointerEvents="none"
            {...HIDDEN_FROM_A11Y}
            testID={testID ? `${testID}-lifted` : undefined}
            style={[styles.lifted, liftedStyle]}>
            {renderLifted(activeId)}
          </Animated.View>
        ) : null}
      </View>
    </DragContext.Provider>
  );
}

export interface DraggableProps {
  /** Unique among this stage's draggables; what onDrop / onHoldTap get. */
  id: string;
  enabled?: boolean;
  /**
   * 'origin' (default): the lifted copy keeps the grab offset, as if the chip
   * itself were picked up. 'pointer': it hangs from the pointer, for a chip
   * drawn inside something wider than itself (a placed chip in a slot).
   */
  liftAnchor?: LiftAnchor;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function Draggable({ id, enabled = true, liftAnchor = 'origin', style, children }: DraggableProps) {
  const c = useInternals();
  const on = enabled && c.enabled;
  const tokenBase = useRef<number | null>(null);
  if (tokenBase.current === null) tokenBase.current = c.nextToken();
  const base = tokenBase.current;
  const anchor = liftAnchor === 'pointer' ? 1 : 0;
  const { values: v, begin, setOver, finish } = c;

  const nodeRef = useRef<View | null>(null);

  const gesture = useMemo(() => {
    const makePan = (kind: number) => {
      const token = base * PAN_KINDS + kind;
      return Gesture.Pan()
        .enabled(WEB_GATE || on)
        .onStart(e => {
          if (!on) return;
          const r = v.dragRects.value[id];
          if (!r) return;
          v.owner.value = token;
          // The mouse and horizontal pans only activate after moving past
          // the slop; the held pan activates standing still.
          v.moved.value = kind !== PAN_HELD;
          v.anchor.value = anchor;
          v.originX.value = r.x;
          v.originY.value = r.y;
          v.originW.value = r.width;
          // Track the pointer by its absolute position, not the pan's
          // translation: on Android a pan that activates after a long press
          // measures its translation from where it activated, not from
          // touch-down, so a translation-based pointer lagged the finger
          // by the first move (a whole row on a phone). e.x is the pointer
          // on this view, r its place in the stage, so this is where the
          // stage sits on screen.
          v.grabX.value = e.x;
          v.grabY.value = e.y;
          v.stageAbsX.value = e.absoluteX - e.x - r.x;
          v.stageAbsY.value = e.absoluteY - e.y - r.y;
          v.px.value = r.x + e.x;
          v.py.value = r.y + e.y;
          v.shiftX.value = 0;
          v.shiftY.value = 0;
          v.over.value = '';
          v.active.value = true;
          runOnJS(begin)(id);
        })
        .onUpdate(e => {
          if (v.owner.value !== token) return;
          if (
            !v.moved.value &&
            (Math.abs(e.translationX) > DRAG_START_DISTANCE ||
              Math.abs(e.translationY) > DRAG_START_DISTANCE)
          ) {
            v.moved.value = true;
          }
          const p = pointerInStage(
            { x: e.absoluteX, y: e.absoluteY },
            { x: v.stageAbsX.value, y: v.stageAbsY.value },
            { x: v.shiftX.value, y: v.shiftY.value },
          );
          v.px.value = p.x;
          v.py.value = p.y;
          const hit = hitTarget(p, v.targetRects.value);
          if (hit !== v.over.value) {
            v.over.value = hit;
            runOnJS(setOver)(hit);
          }
        })
        .onFinalize((_e, success) => {
          // Finalize runs for every pan in the Race, including one that
          // never started (a tap) and the losers the winner cancelled. Only
          // the pan that started this drag (same token) may end it.
          if (v.owner.value !== token) return;
          v.owner.value = -1;
          const held = success && !v.moved.value;
          runOnJS(finish)(id, success ? v.over.value : '', held);
        });
    };

    if (Platform.OS === 'web' && !WEB_COARSE_POINTER) {
      // Mouse and pen: no scroll to share with, so any 8pt movement drags.
      return makePan(PAN_MOUSE).minDistance(DRAG_START_DISTANCE);
    }
    // Touch: a mostly-horizontal 8pt move drags at once; a vertical-first
    // move fails this pan and goes to the scroll view, unless the finger
    // first held still for LONG_PRESS_MS, which starts a drag in any
    // direction.
    const horizontal = makePan(PAN_HORIZONTAL)
      .activeOffsetX([-DRAG_START_DISTANCE, DRAG_START_DISTANCE])
      .failOffsetY([-DRAG_START_DISTANCE, DRAG_START_DISTANCE]);
    const held = makePan(PAN_HELD).activateAfterLongPress(LONG_PRESS_MS);
    return Gesture.Race(horizontal, held);
  }, [id, on, base, anchor, v, begin, setOver, finish]);

  const { register } = c;
  const setNode = useCallback(
    (node: View | null) => {
      nodeRef.current = node;
      register('drag', id, node);
    },
    [id, register],
  );

  // Web: gesture-handler sets touch-action: none on the view when it
  // attaches (after this effect, hence the timeout), which would stop a
  // touch that starts on a chip from scrolling the page; pan-y lets a
  // vertical swipe scroll. Once a drag is on (a hold, then any direction),
  // its touch moves are the drag's, not the page's. Also no text selection
  // and no native image drag (an <img> would start the browser's own drag
  // and steal the pointer).
  const isDragging = c.isDragging;
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = nodeRef.current as unknown as HTMLElement | null;
    if (!el?.addEventListener) return;
    const noNativeDrag = (e: Event) => e.preventDefault();
    el.addEventListener('dragstart', noNativeDrag);
    const holdTouch = (e: Event) => {
      if (isDragging() && e.cancelable) e.preventDefault();
    };
    el.addEventListener('touchmove', holdTouch, { passive: false });
    const t = setTimeout(() => {
      el.style.touchAction = 'pan-y';
      el.style.userSelect = 'none';
      (el.style as unknown as Record<string, string>).webkitUserSelect = 'none';
    }, 0);
    return () => {
      clearTimeout(t);
      el.removeEventListener('dragstart', noNativeDrag);
      el.removeEventListener('touchmove', holdTouch);
    };
  }, [gesture, isDragging]);

  return (
    <GestureDetector gesture={gesture}>
      {/* Not accessible and no role: the chip inside is the one control. */}
      <View
        ref={setNode}
        collapsable={false}
        accessible={false}
        onLayout={c.scheduleRemeasure}
        style={style}>
        {children}
      </View>
    </GestureDetector>
  );
}

export interface DropTargetProps {
  id: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  testID?: string;
}

export function DropTarget({ id, style, children, testID }: DropTargetProps) {
  const c = useInternals();
  const { register } = c;
  const setNode = useCallback(
    (node: View | null) => register('target', id, node),
    [id, register],
  );
  return (
    <View
      ref={setNode}
      collapsable={false}
      accessible={false}
      testID={testID}
      onLayout={(_e: LayoutChangeEvent) => c.scheduleRemeasure()}
      style={style}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'relative' },
  lifted: { position: 'absolute', zIndex: 30, elevation: 30 },
});
