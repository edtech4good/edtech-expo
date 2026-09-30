import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityActionEvent,
  AccessibilityInfo,
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import {
  applyTap,
  availableMoveActions,
  caretRect,
  describeGap,
  gridColumns,
  gridItemWidth,
  insertionTarget,
  isNoopGap,
  itemAccessibilityLabel,
  keyboardAction,
  moveActionTarget,
  moveAnnouncement,
  moveItem,
  MoveAction,
  Rect,
  swapAnnouncement,
  Translate,
  targetIndexForGap,
} from './reorder';

/**
 * ReorderableList: the shared drag primitive for the corporate ordering
 * questions (docs/design/corporate-question-types in the workspace repo).
 *
 * Two layouts:
 * - 'inline': tiles sized to their content wrap across lines like a
 *   sentence (word ordering);
 * - 'grid': equal tiles, 2 across under 600pt of container width and 4
 *   across from 600 (picture ordering).
 *
 * Both behave the same way:
 * - Drag: the whole tile is the handle. While dragging, a lifted copy
 *   follows the finger, a dashed ghost holds the old spot, and a vertical
 *   caret shows the gap it will land in. Nothing reflows until the drop.
 *   On native a drag starts after 8pt of mostly-horizontal movement, or
 *   after a 250ms hold in any direction; a quick vertical swipe is left to
 *   the enclosing scroll view. With a mouse on the web any 8pt movement
 *   starts it; a touch screen on the web uses the touch rules, and there a
 *   vertical move always scrolls the page (the browser owns it).
 * - Tap to swap: tap one tile to pick it, tap another to swap the two, tap
 *   the picked one again to cancel.
 * - Screen readers: each tile is a button labelled "Write. Word 3 of 6",
 *   double-tap is the tap above, and the custom actions Move earlier, Move
 *   later, Move to start and Move to end move it one step or to either end.
 *   A polite live region reads the new order after every change.
 * - Keyboard (web): Tab to a tile, Enter or Space to pick / swap / cancel;
 *   while picked, the arrow keys, Home and End move it and Escape cancels.
 *
 * It reports the order as an array of item ids through onOrderChange,
 * which is what answerV1's orderAnswer() takes.
 *
 * Structure (web: <div><div stage><ul><li><button/>accessory</li>...</ul>
 * caret lifted</div> live</div>): the list holds only list items; the
 * caret, the lifted copy and the live region sit outside it.
 *
 * Step 2 notes (things this spike did not settle):
 * - Scroll arbitration was only proven inside gesture-handler's own
 *   ScrollView (the drag lab). The real question screens scroll with
 *   KeyboardAwareScrollView, a plain React Native ScrollView, which is not
 *   part of the gesture-handler tree; on iOS in particular the scroll and a
 *   drag may run at once. Check inside the real screen, and expect to need
 *   simultaneousWithExternalGesture / blocksExternalGesture or a
 *   Gesture.Native() wrapper around that scroll view.
 * - `items` must be referentially stable (useMemo it): a new array rebuilds
 *   the id map and every callback that depends on it. Tile is memoised but
 *   its `children` are a fresh element every render, so the memo does not
 *   stop re-renders; that is fine at these list sizes (under ~12 items).
 * - WEB_COARSE_POINTER is read once at module load, so a hybrid device that
 *   switches between mouse and touch keeps the rules it started with.
 * - The live region only speaks when its text changes: the same
 *   announcement twice in a row (e.g. two identical swaps) is read once.
 * - Escape on a tile that is not picked does nothing (keyboardAction).
 * - Strings (hints, announcements, action labels, "Word 3 of 6") come from
 *   the `reorder.*` keys in en.json and km.json through react-i18next; the
 *   Khmer is a draft that still needs a native speaker's review. `noun` is
 *   passed in by the caller, already translated.
 */

export interface ReorderItem {
  id: string;
  /** What a screen reader and the announcements call this item. */
  label: string;
}

export interface TileState {
  index: number;
  count: number;
  picked: boolean;
  /** True for the lifted copy that follows the pointer. */
  lifted: boolean;
}

export type ReorderStatus =
  | { kind: 'idle' }
  | { kind: 'picked'; id: string; label: string }
  | { kind: 'dragging'; id: string; label: string; target: string | null };

export interface ReorderableListProps<T extends ReorderItem> {
  /** Items in their starting order. Remount (change `key`) to reset. */
  items: ReadonlyArray<T>;
  layout: 'inline' | 'grid';
  /** "Word" or "Photo": used in "Word 3 of 6" and "moved to word 1". */
  noun: string;
  /**
   * The tile's content. It is rendered INSIDE the tile's button (a real
   * <button> on the web), so it must not contain anything interactive: no
   * Pressable, button, link or input. Nested interactive elements are
   * invalid HTML, and a screen reader can't reach them. Put per-item
   * controls (e.g. an audio button) in renderAccessory instead.
   */
  renderItem: (item: T, state: TileState) => ReactNode;
  /**
   * Optional per-item controls, such as a 44pt audio button. They render
   * in the list item as a SIBLING of the tile button, in a layer over the
   * tile (absolute fill, pointerEvents box-none), so the caller positions
   * them (e.g. bottom-right) and leaves room for them in renderItem.
   * A touch or click on an accessory never starts a drag or a pick, and a
   * screen reader reaches it as its own element after the tile.
   */
  renderAccessory?: (item: T, state: TileState) => ReactNode;
  onOrderChange?: (ids: string[]) => void;
  onStatusChange?: (status: ReorderStatus) => void;
  disabled?: boolean;
  /**
   * Restyles one tile's frame after the drag and pick styles, e.g. the
   * mint or orange result tint from the corporate kit (`tileFrame` in
   * src/components/kit). Return undefined for the default frame. While
   * `disabled` is true the grip glyph is hidden too, so a locked tile
   * doesn't advertise a move that no longer works.
   */
  frameFor?: (item: T) => ViewStyle | undefined;
  /**
   * A per-item status appended to the tile's accessibility label, e.g. the
   * result mark after Submit ("Write. Word 3 of 6. Correct"). The tile's
   * own content is inside the labelled button, so a label drawn in
   * renderItem is never read; this is how a mark reaches a screen reader.
   * Return undefined for no status (the label is unchanged).
   */
  itemStatusFor?: (item: T) => string | undefined;
  /** Horizontal / vertical space between tiles. */
  gapX?: number;
  gapY?: number;
  /**
   * Applied to an outer wrapper. Padding and border here are safe: tile
   * rects, the caret and the lifted copy all share an inner frame with no
   * padding or border of its own.
   */
  style?: StyleProp<ViewStyle>;
  /** On the list element; the live region gets `${testID}-live`. */
  testID?: string;
}

const CARET_WIDTH = 4;

/** Props that take a view and everything in it out of the accessibility tree. */
const HIDDEN_FROM_A11Y = {
  importantForAccessibility: 'no-hide-descendants',
  accessibilityElementsHidden: true,
  'aria-hidden': true,
} as const;

/**
 * A touch screen on the web. There the browser, not the gesture system, owns
 * vertical scrolling, so a tile uses the touch rules (see Tile) and lets the
 * browser pan vertically across it (touch-action: pan-y).
 */
const WEB_COARSE_POINTER =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;
const DRAG_START_DISTANCE = 8;
const LONG_PRESS_MS = 250;

const RAISED = Platform.select<ViewStyle>({
  web: {
    boxShadow: '0 1px 2px rgba(9,16,29,0.06), 0 2px 6px rgba(9,16,29,0.06)',
  } as ViewStyle,
  android: { elevation: 2 },
  default: {
    shadowColor: '#09101D',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});

const LIFTED = Platform.select<ViewStyle>({
  web: { boxShadow: '0 12px 28px rgba(9,16,29,0.18)' } as ViewStyle,
  android: { elevation: 12 },
  default: {
    shadowColor: '#09101D',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 12 },
  },
});

/** Six-dot grip glyph (2 columns x 3 rows). */
export function GripGlyph({ color, size = 12 }: { color: string; size?: number }) {
  const dot = Math.max(2, Math.round(size / 5));
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: dot * 3, height: size, justifyContent: 'space-between' }}>
      {[0, 1, 2].map(r => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
          <View style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

interface DragValues {
  rects: SharedValue<Rect[]>;
  from: SharedValue<number>;
  originX: SharedValue<number>;
  originY: SharedValue<number>;
  originW: SharedValue<number>;
  grabX: SharedValue<number>;
  grabY: SharedValue<number>;
  tx: SharedValue<number>;
  ty: SharedValue<number>;
  gap: SharedValue<number>;
  atLineEnd: SharedValue<boolean>;
  /** Which pan of which tile owns the drag in progress (-1: none). */
  owner: SharedValue<number>;
  /** Whether the pointer has moved past the slop since the drag began. */
  moved: SharedValue<boolean>;
}

// Pan kinds, for the owner token (index * PAN_KINDS + kind).
const PAN_MOUSE = 0;
const PAN_HORIZONTAL = 1;
const PAN_HELD = 2;
const PAN_KINDS = 3;

interface TileProps {
  id: string;
  index: number;
  count: number;
  label: string;
  noun: string;
  /** Appended to the accessibility label (itemStatusFor). */
  status?: string;
  picked: boolean;
  somethingPicked: boolean;
  ghost: boolean;
  disabled: boolean;
  layout: 'inline' | 'grid';
  frameStyle: ViewStyle;
  pickedStyle: ViewStyle;
  ghostStyle: ViewStyle;
  toneStyle?: ViewStyle;
  drag: DragValues;
  onTap: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDragTarget: (index: number, gap: number) => void;
  onDrop: (index: number, gap: number) => void;
  onHoldTap: (index: number) => void;
  onKey: (id: string, key: string) => boolean;
  setRef: (id: string, node: View | null) => void;
  t: Translate;
  children: ReactNode;
}

const Tile = memo(function Tile({
  id,
  index,
  count,
  label,
  noun,
  status,
  picked,
  somethingPicked,
  ghost,
  disabled,
  frameStyle,
  pickedStyle,
  ghostStyle,
  toneStyle,
  drag,
  onTap,
  onMove,
  onDragStart,
  onDragTarget,
  onDrop,
  onHoldTap,
  onKey,
  setRef,
  t,
  children,
}: TileProps) {
  const gesture = useMemo(() => {
    const makePan = (kind: number) => {
      const token = index * PAN_KINDS + kind;
      return Gesture.Pan()
        .enabled(!disabled)
        .onStart(e => {
          const r = drag.rects.value[index];
          if (!r) return;
          drag.owner.value = token;
          // The mouse and horizontal pans only activate after moving past
          // the slop; the held pan activates standing still.
          drag.moved.value = kind !== PAN_HELD;
          drag.from.value = index;
          drag.originX.value = r.x;
          drag.originY.value = r.y;
          drag.originW.value = r.width;
          // The pan activates after some movement: e.x is where the pointer
          // is now, translationX how far it has come since touch-down.
          drag.grabX.value = e.x - e.translationX;
          drag.grabY.value = e.y - e.translationY;
          drag.tx.value = e.translationX;
          drag.ty.value = e.translationY;
          drag.gap.value = -1;
          runOnJS(onDragStart)(index);
        })
        .onUpdate(e => {
          if (drag.owner.value !== token) return;
          if (
            !drag.moved.value &&
            (Math.abs(e.translationX) > DRAG_START_DISTANCE ||
              Math.abs(e.translationY) > DRAG_START_DISTANCE)
          ) {
            drag.moved.value = true;
          }
          drag.tx.value = e.translationX;
          drag.ty.value = e.translationY;
          const t = insertionTarget(
            {
              x: drag.originX.value + drag.grabX.value + e.translationX,
              y: drag.originY.value + drag.grabY.value + e.translationY,
            },
            drag.rects.value,
          );
          if (t.gap !== drag.gap.value || t.atLineEnd !== drag.atLineEnd.value) {
            const gapChanged = t.gap !== drag.gap.value;
            drag.gap.value = t.gap;
            drag.atLineEnd.value = t.atLineEnd;
            if (gapChanged) runOnJS(onDragTarget)(index, t.gap);
          }
        })
        .onFinalize((_e, success) => {
          // Finalize runs for every pan in the Race, including one that
          // never started (a tap) and the losers the winner cancelled. Only
          // the pan that started this drag (same token) may end it, so a
          // losing pan's finalize can never end a drag early.
          if (drag.owner.value !== token) return;
          drag.owner.value = -1;
          if (success && !drag.moved.value) {
            // A press held past LONG_PRESS_MS without moving: a slow tap.
            runOnJS(onHoldTap)(index);
            return;
          }
          runOnJS(onDrop)(index, success ? drag.gap.value : -1);
        });
    };

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDistance(DRAG_START_DISTANCE)
      .onEnd((_e, success) => {
        if (success) runOnJS(onTap)(id);
      });

    if (Platform.OS === 'web' && !WEB_COARSE_POINTER) {
      // Mouse and pen: no scroll to share with, so any 8pt movement drags.
      const pan = makePan(PAN_MOUSE).minDistance(DRAG_START_DISTANCE);
      return Gesture.Race(pan, tap);
    }
    // Touch: a mostly-horizontal 8pt move drags at once; a vertical-first
    // move fails this pan and goes to the scroll view, unless the finger
    // first held still for LONG_PRESS_MS, which starts a drag in any
    // direction.
    const horizontal = makePan(PAN_HORIZONTAL)
      .activeOffsetX([-DRAG_START_DISTANCE, DRAG_START_DISTANCE])
      .failOffsetY([-DRAG_START_DISTANCE, DRAG_START_DISTANCE]);
    const held = makePan(PAN_HELD).activateAfterLongPress(LONG_PRESS_MS);
    return Gesture.Race(horizontal, held, tap);
  }, [id, index, disabled, drag, onTap, onDragStart, onDragTarget, onDrop, onHoldTap]);

  // gesture-handler sets touch-action: none on the tile when it attaches
  // (after this effect, hence the timeout), which would stop a touch that
  // starts on a tile from scrolling the page.
  const nodeRef = useRef<View | null>(null);
  useEffect(() => {
    if (!WEB_COARSE_POINTER) return;
    const t = setTimeout(() => {
      const el = nodeRef.current as unknown as HTMLElement | null;
      if (el?.style) el.style.touchAction = 'pan-y';
    }, 0);
    return () => clearTimeout(t);
  }, [gesture]);

  const actions = useMemo(
    () => [
      { name: 'activate' },
      ...availableMoveActions(index, count).map(a => ({
        name: a,
        label: t(`reorder.${a}`),
      })),
    ],
    [index, count, t],
  );

  const handleAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (disabled) return;
      const name = e.nativeEvent.actionName;
      if (name === 'activate') {
        onTap(id);
        return;
      }
      const to = moveActionTarget(name as MoveAction, index, count);
      if (to !== null) onMove(index, to);
    },
    [disabled, id, index, count, onTap, onMove],
  );

  // Web only: react-native-web forwards onKeyDown to the element; React
  // Native's View types don't declare it.
  const webKeyProps =
    Platform.OS === 'web'
      ? ({
          focusable: !disabled,
          onKeyDown: (e: { key: string; preventDefault: () => void }) => {
            if (onKey(id, e.key)) e.preventDefault();
          },
        } as object)
      : {};

  const hint = picked
    ? t('reorder.hint.picked')
    : somethingPicked
      ? t('reorder.hint.swapWith')
      : t('reorder.hint.idle');

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={node => {
          nodeRef.current = node;
          setRef(id, node);
        }}
        collapsable={false}
        accessible
        accessibilityRole="button"
        accessibilityLabel={itemAccessibilityLabel(label, noun, index, count, t, status)}
        accessibilityHint={hint}
        accessibilityState={{ selected: picked, disabled }}
        accessibilityActions={actions}
        onAccessibilityAction={handleAction}
        testID={`reorder-tile-${id}`}
        {...webKeyProps}
        style={[
          frameStyle,
          picked ? pickedStyle : null,
          toneStyle,
          ghost ? ghostStyle : null,
        ]}>
        <View style={{ opacity: ghost ? 0 : 1 }}>
          {children}
        </View>
      </View>
    </GestureDetector>
  );
});

function ReorderableListInner<T extends ReorderItem>({
  items,
  layout,
  noun,
  renderItem,
  renderAccessory,
  onOrderChange,
  onStatusChange,
  disabled = false,
  frameFor,
  itemStatusFor,
  gapX = layout === 'grid' ? 12 : 10,
  gapY = 12,
  style,
  testID,
}: ReorderableListProps<T>) {
  const theme = useTheme();
  const colors = theme.colors;
  const { t: i18nT } = useTranslation();
  const t = i18nT as unknown as Translate;

  const byId = useMemo(() => {
    const m: Record<string, T> = {};
    items.forEach(i => {
      m[i.id] = i;
    });
    return m;
  }, [items]);

  const [order, setOrder] = useState<string[]>(() => items.map(i => i.id));
  const orderRef = useRef(order);
  orderRef.current = order;
  const [picked, setPicked] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [containerWidth, setContainerWidth] = useState(0);

  const columns = layout === 'grid' ? gridColumns(containerWidth) : 0;
  const itemWidth =
    layout === 'grid' && containerWidth > 0
      ? gridItemWidth(containerWidth, columns, gapX)
      : undefined;

  const drag: DragValues = {
    rects: useSharedValue<Rect[]>([]),
    from: useSharedValue(-1),
    originX: useSharedValue(0),
    originY: useSharedValue(0),
    originW: useSharedValue(0),
    grabX: useSharedValue(0),
    grabY: useSharedValue(0),
    tx: useSharedValue(0),
    ty: useSharedValue(0),
    gap: useSharedValue(-1),
    atLineEnd: useSharedValue(false),
    owner: useSharedValue(-1),
    moved: useSharedValue(false),
  };
  const dragRef = useRef(drag);
  const stableDrag = dragRef.current;

  // ---- Measuring. Rects are each list item's frame in the stage's
  // coordinates (the list sits at the stage's origin with no padding), in
  // the current order. The caret and lifted copy are positioned in the
  // same frame.
  const stageRef = useRef<View>(null);
  const rectById = useRef<Record<string, Rect>>({});
  const itemRefs = useRef<Record<string, View | null>>({});
  const tileRefs = useRef<Record<string, View | null>>({});
  const draggingIdRef = useRef<string | null>(null);

  const publishRects = useCallback(() => {
    stableDrag.rects.value = orderRef.current.map(
      id => rectById.current[id] ?? { x: 0, y: 0, width: 0, height: 0 },
    );
  }, [stableDrag]);

  // measureLayout every item against the stage. Needed on the web, where
  // onLayout only fires when an element's SIZE changes: a tile that moves
  // to another line at the same size (after a reorder, a late font, a
  // sibling growing) would otherwise keep a stale rect and the drop would
  // land in the wrong gap. Harmless on native.
  const remeasure = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    orderRef.current.forEach(id => {
      const node = itemRefs.current[id];
      if (!node) return;
      node.measureLayout(
        stage,
        (x, y, width, height) => {
          rectById.current[id] = { x, y, width, height };
          // A drag that started on a stale rect: move its origin too.
          if (draggingIdRef.current === id) {
            stableDrag.originX.value = x;
            stableDrag.originY.value = y;
          }
          publishRects();
        },
        () => undefined,
      );
    });
  }, [publishRects, stableDrag]);

  // Coalesce bursts (every item's onLayout, font events) into one pass.
  const remeasureFrame = useRef<number | null>(null);
  const scheduleRemeasure = useCallback(() => {
    if (remeasureFrame.current !== null) return;
    remeasureFrame.current = requestAnimationFrame(() => {
      remeasureFrame.current = null;
      remeasure();
    });
  }, [remeasure]);
  useEffect(
    () => () => {
      if (remeasureFrame.current !== null) cancelAnimationFrame(remeasureFrame.current);
    },
    [],
  );

  const onItemLayout = useCallback(
    (id: string, e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      rectById.current[id] = { x, y, width, height };
      publishRects();
      // One item changing size can move others without resizing them.
      if (Platform.OS === 'web') scheduleRemeasure();
    },
    [publishRects, scheduleRemeasure],
  );

  useEffect(() => {
    publishRects();
    scheduleRemeasure();
  }, [order, containerWidth, publishRects, scheduleRemeasure]);

  // Web: re-measure when the stage resizes (content or wrapping changed)
  // and when any web font finishes loading (Khmer glyphs change widths).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const cleanups: Array<() => void> = [];
    const el = stageRef.current as unknown as Element | null;
    const RO = (window as unknown as { ResizeObserver?: typeof ResizeObserver })
      .ResizeObserver;
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

  const setItemRef = useCallback((id: string, node: View | null) => {
    itemRefs.current[id] = node;
  }, []);

  const setRef = useCallback((id: string, node: View | null) => {
    tileRefs.current[id] = node;
  }, []);

  // ---- Announcements and status.
  const labelsOf = useCallback(
    (ids: ReadonlyArray<string>) => ids.map(id => byId[id]?.label ?? id),
    [byId],
  );

  const announce = useCallback((text: string) => {
    setAnnouncement(text);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(text);
  }, []);

  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;
  const orderChangeRef = useRef(onOrderChange);
  orderChangeRef.current = onOrderChange;

  const commitOrder = useCallback((next: string[]) => {
    orderRef.current = next;
    setOrder(next);
    orderChangeRef.current?.(next);
  }, []);

  // ---- Web keyboard: refocus the moved tile (React moving the DOM node
  // drops focus).
  const focusAfterMove = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    const node = tileRefs.current[id] as unknown as { focus?: () => void } | null;
    node?.focus?.();
  }, [order]);

  // ---- Actions.
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const onTap = useCallback(
    (id: string) => {
      if (disabled) return;
      const r = applyTap(orderRef.current, pickedRef.current, id);
      const label = byId[id]?.label ?? id;
      if (r.event === 'picked') {
        announce(t('reorder.announce.picked', { label }));
        statusRef.current?.({ kind: 'picked', id, label });
      } else if (r.event === 'cancelled') {
        announce(t('reorder.announce.putBack', { label }));
        statusRef.current?.({ kind: 'idle' });
      } else {
        const a = byId[pickedRef.current as string]?.label ?? '';
        commitOrder(r.order);
        focusAfterMove.current = id;
        announce(swapAnnouncement(a, label, labelsOf(r.order), t));
        statusRef.current?.({ kind: 'idle' });
      }
      pickedRef.current = r.picked;
      setPicked(r.picked);
    },
    [disabled, byId, announce, commitOrder, labelsOf, t],
  );

  const onMove = useCallback(
    (from: number, to: number) => {
      const current = orderRef.current;
      const id = current[from];
      if (id === undefined) return;
      const next = moveItem(current, from, to);
      commitOrder(next);
      focusAfterMove.current = id;
      announce(moveAnnouncement(byId[id]?.label ?? id, noun, to, labelsOf(next), t));
    },
    [byId, noun, announce, commitOrder, labelsOf, t],
  );

  const onKey = useCallback(
    (id: string, key: string) => {
      const index = orderRef.current.indexOf(id);
      const r = keyboardAction(
        key,
        index,
        orderRef.current.length,
        pickedRef.current === id,
        layout === 'grid' ? columns : 1,
      );
      if (r.kind === 'tap') {
        onTap(id);
        return true;
      }
      if (r.kind === 'cancel') {
        onTap(id);
        return true;
      }
      if (r.kind === 'move') {
        onMove(index, r.to);
        statusRef.current?.({ kind: 'picked', id, label: byId[id]?.label ?? id });
        return true;
      }
      return false;
    },
    [layout, columns, onTap, onMove, byId],
  );

  // The pick in force when a drag began, so a hold that turns out to be a
  // slow tap (onHoldTap) is judged against it.
  const pickBeforeDrag = useRef<string | null>(null);

  const onDragStart = useCallback(
    (index: number) => {
      const id = orderRef.current[index];
      if (!id) return;
      pickBeforeDrag.current = pickedRef.current;
      if (pickedRef.current) {
        pickedRef.current = null;
        setPicked(null);
      }
      draggingIdRef.current = id;
      setDraggingId(id);
      // Belt and braces for stale rects (see remeasure).
      remeasure();
      statusRef.current?.({ kind: 'dragging', id, label: byId[id]?.label ?? id, target: null });
    },
    [byId, remeasure],
  );

  const onDragTarget = useCallback(
    (index: number, gap: number) => {
      const id = orderRef.current[index];
      if (!id) return;
      statusRef.current?.({
        kind: 'dragging',
        id,
        label: byId[id]?.label ?? id,
        target: describeGap(index, gap, labelsOf(orderRef.current), t),
      });
    },
    [byId, labelsOf, t],
  );

  const endDrag = useCallback(() => {
    stableDrag.from.value = -1;
    stableDrag.gap.value = -1;
    draggingIdRef.current = null;
    setDraggingId(null);
  }, [stableDrag]);

  const onDrop = useCallback(
    (index: number, gap: number) => {
      endDrag();
      statusRef.current?.({ kind: 'idle' });
      if (gap < 0 || isNoopGap(index, gap)) return;
      onMove(index, targetIndexForGap(index, gap));
    },
    [endDrag, onMove],
  );

  // A hold that never moved past the slop is a tap: pick, swap or cancel,
  // judged against the pick that was in force before the hold.
  const onHoldTap = useCallback(
    (index: number) => {
      endDrag();
      const id = orderRef.current[index];
      if (!id) return;
      pickedRef.current = pickBeforeDrag.current;
      setPicked(pickBeforeDrag.current);
      if (!pickBeforeDrag.current) statusRef.current?.({ kind: 'idle' });
      onTap(id);
    },
    [endDrag, onTap],
  );

  // ---- Styles.
  const frameStyle = useMemo<ViewStyle>(
    () =>
      layout === 'inline'
        ? {
            minHeight: 48,
            minWidth: 48,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.outline,
            backgroundColor: colors.surface,
            paddingLeft: 9,
            paddingRight: 14,
            justifyContent: 'center',
            ...RAISED,
          }
        : {
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.outline,
            backgroundColor: colors.surface,
            padding: 7,
            ...RAISED,
          },
    [layout, colors],
  );
  const pickedStyle = useMemo<ViewStyle>(
    () => ({
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
      ...(layout === 'inline'
        ? { paddingLeft: 8.5, paddingRight: 13.5 }
        : { padding: 6.5 }),
    }),
    [layout, colors],
  );
  const ghostStyle = useMemo<ViewStyle>(
    () => ({
      borderStyle: 'dashed',
      borderColor: colors.secondaryLight,
      backgroundColor: 'transparent',
      ...(Platform.OS === 'web'
        ? ({ boxShadow: 'none' } as ViewStyle)
        : { elevation: 0, shadowOpacity: 0 }),
    }),
    [colors],
  );

  const stageWidth = useSharedValue(0);
  useEffect(() => {
    stageWidth.value = containerWidth;
  }, [containerWidth, stageWidth]);

  const liftedStyle = useAnimatedStyle(() => {
    if (stableDrag.from.value < 0) return { opacity: 0, left: 0, top: 0 };
    return {
      opacity: 1,
      left: stableDrag.originX.value + stableDrag.tx.value,
      top: stableDrag.originY.value + stableDrag.ty.value,
      // A grid card keeps its width; a word tile may grow a hair (its
      // border is 0.5pt thicker when lifted) rather than wrap.
      ...(layout === 'grid'
        ? { width: stableDrag.originW.value }
        : { minWidth: stableDrag.originW.value }),
    };
  });

  const caretStyle = useAnimatedStyle(() => {
    const from = stableDrag.from.value;
    const gap = stableDrag.gap.value;
    if (from < 0 || gap < 0 || isNoopGap(from, gap)) {
      return { opacity: 0, left: 0, top: 0, height: 0 };
    }
    const r = caretRect(
      { gap, atLineEnd: stableDrag.atLineEnd.value },
      stableDrag.rects.value,
      gapX,
      CARET_WIDTH,
      stageWidth.value,
    );
    if (!r) return { opacity: 0, left: 0, top: 0, height: 0 };
    return { opacity: 1, left: r.x, top: r.y, height: r.height };
  });

  const draggingItem = draggingId ? byId[draggingId] : undefined;

  const tileState = (item: T, index: number, lifted: boolean): TileState => ({
    index,
    count: order.length,
    picked: !lifted && picked === item.id,
    lifted,
  });

  const tileContent = (item: T, state: TileState) =>
    layout === 'inline' ? (
      <View style={styles.inlineContent}>
        {disabled ? null : (
          <GripGlyph color={state.picked ? colors.primary : colors.placeholder} />
        )}
        {renderItem(item, state)}
      </View>
    ) : (
      renderItem(item, state)
    );

  // Web: <ul role=list> may only hold <li> items.
  const webListItemRole = Platform.OS === 'web' ? ({ role: 'listitem' } as object) : {};

  return (
    <View style={style}>
      <View
        ref={stageRef}
        collapsable={false}
        onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
        style={styles.stage}>
        <View
          testID={testID}
          accessibilityRole="list"
          style={[styles.container, { columnGap: gapX, rowGap: gapY }]}>
          {order.map((id, index) => {
            const item = byId[id];
            if (!item) return null;
            const state = tileState(item, index, false);
            const isGhost = draggingId === id;
            return (
              <View
                key={id}
                ref={node => setItemRef(id, node)}
                collapsable={false}
                onLayout={e => onItemLayout(id, e)}
                {...webListItemRole}
                style={itemWidth !== undefined ? { width: itemWidth } : null}>
                <Tile
                  id={id}
                  index={index}
                  count={order.length}
                  label={item.label}
                  noun={noun}
                  status={itemStatusFor?.(item)}
                  picked={state.picked}
                  somethingPicked={picked !== null}
                  ghost={isGhost}
                  disabled={disabled}
                  layout={layout}
                  frameStyle={frameStyle}
                  pickedStyle={pickedStyle}
                  ghostStyle={ghostStyle}
                  toneStyle={frameFor?.(item)}
                  drag={stableDrag}
                  onTap={onTap}
                  onMove={onMove}
                  onDragStart={onDragStart}
                  onDragTarget={onDragTarget}
                  onDrop={onDrop}
                  onHoldTap={onHoldTap}
                  onKey={onKey}
                  setRef={setRef}
                  t={t}>
                  {tileContent(item, state)}
                </Tile>
                {renderAccessory ? (
                  <View
                    // While this tile is being dragged, its accessory is
                    // hidden from touches and screen readers, not only
                    // faded: the ghost is a placeholder, not a control.
                    pointerEvents={isGhost ? 'none' : 'box-none'}
                    {...(isGhost ? HIDDEN_FROM_A11Y : null)}
                    style={[StyleSheet.absoluteFill, isGhost ? styles.hidden : null]}>
                    {renderAccessory(item, state)}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.caret, { backgroundColor: colors.primary }, caretStyle]}>
          <View style={[styles.caretDot, styles.caretDotTop, { backgroundColor: colors.primary }]} />
          <View style={[styles.caretDot, styles.caretDotBottom, { backgroundColor: colors.primary }]} />
        </Animated.View>

        {draggingItem ? (
          <Animated.View
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            aria-hidden
            style={[styles.lifted, liftedStyle]}>
            <View
              style={[
                frameStyle,
                {
                  borderWidth: 2,
                  borderColor: colors.primary,
                  transform: [{ rotate: layout === 'inline' ? '-3deg' : '-2deg' }],
                },
                LIFTED,
                layout === 'inline' ? { paddingLeft: 8.5, paddingRight: 13.5 } : { padding: 6.5 },
              ]}>
              {tileContent(draggingItem, tileState(draggingItem, order.indexOf(draggingItem.id), true))}
            </View>
            {renderAccessory ? (
              <View pointerEvents="none" {...HIDDEN_FROM_A11Y} style={StyleSheet.absoluteFill}>
                {renderAccessory(
                  draggingItem,
                  tileState(draggingItem, order.indexOf(draggingItem.id), true),
                )}
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      <Text
        accessibilityLiveRegion="polite"
        style={styles.liveRegion}
        testID={testID ? `${testID}-live` : undefined}>
        {announcement}
      </Text>
    </View>
  );
}

// memo drops generics; cast back so callers keep T inference.
const ReorderableList = memo(ReorderableListInner) as typeof ReorderableListInner;
export default ReorderableList;

const styles = StyleSheet.create({
  stage: {
    position: 'relative',
  },
  hidden: {
    opacity: 0,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    position: 'relative',
  },
  inlineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 7,
  },
  caret: {
    position: 'absolute',
    width: CARET_WIDTH,
    borderRadius: 2,
    zIndex: 20,
    elevation: 20,
  },
  caretDot: {
    position: 'absolute',
    left: -3.5,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  caretDotTop: { top: -6 },
  caretDotBottom: { bottom: -6 },
  lifted: {
    position: 'absolute',
    zIndex: 30,
  },
  liveRegion: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1,
    height: 1,
    overflow: 'hidden',
    color: 'transparent',
  },
});
