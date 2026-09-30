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
  MOVE_ACTION_LABELS,
  moveActionTarget,
  moveAnnouncement,
  moveItem,
  MoveAction,
  Rect,
  swapAnnouncement,
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
 * Scrolling: put it in react-native-gesture-handler's ScrollView (or give
 * the enclosing scroll view's gesture to the same gesture tree) so the
 * scroll and the drag negotiate through one gesture system.
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
  renderItem: (item: T, state: TileState) => ReactNode;
  onOrderChange?: (ids: string[]) => void;
  onStatusChange?: (status: ReorderStatus) => void;
  disabled?: boolean;
  /** Horizontal / vertical space between tiles. */
  gapX?: number;
  gapY?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const CARET_WIDTH = 4;

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
}

interface TileProps {
  id: string;
  index: number;
  count: number;
  label: string;
  noun: string;
  picked: boolean;
  somethingPicked: boolean;
  ghost: boolean;
  disabled: boolean;
  layout: 'inline' | 'grid';
  width?: number;
  columns: number;
  frameStyle: ViewStyle;
  pickedStyle: ViewStyle;
  ghostStyle: ViewStyle;
  drag: DragValues;
  onTap: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDragTarget: (index: number, gap: number) => void;
  onDrop: (index: number, gap: number) => void;
  onKey: (id: string, key: string) => boolean;
  onTileLayout: (id: string, e: LayoutChangeEvent) => void;
  setRef: (id: string, node: View | null) => void;
  children: ReactNode;
}

const Tile = memo(function Tile({
  id,
  index,
  count,
  label,
  noun,
  picked,
  somethingPicked,
  ghost,
  disabled,
  width,
  frameStyle,
  pickedStyle,
  ghostStyle,
  drag,
  onTap,
  onMove,
  onDragStart,
  onDragTarget,
  onDrop,
  onKey,
  onTileLayout,
  setRef,
  children,
}: TileProps) {
  const gesture = useMemo(() => {
    const makePan = () =>
      Gesture.Pan()
        .enabled(!disabled)
        .onStart(e => {
          const r = drag.rects.value[index];
          if (!r) return;
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
          if (drag.from.value !== index) return;
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
          // Finalize also runs for a touch that never became a drag (a tap);
          // from.value is only ours if onStart ran.
          if (drag.from.value !== index) return;
          runOnJS(onDrop)(index, success ? drag.gap.value : -1);
        });

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .maxDistance(DRAG_START_DISTANCE)
      .onEnd((_e, success) => {
        if (success) runOnJS(onTap)(id);
      });

    if (Platform.OS === 'web' && !WEB_COARSE_POINTER) {
      // Mouse and pen: no scroll to share with, so any 8pt movement drags.
      const pan = makePan().minDistance(DRAG_START_DISTANCE);
      return Gesture.Race(pan, tap);
    }
    // Touch: a mostly-horizontal 8pt move drags at once; a vertical-first
    // move fails this pan and goes to the scroll view, unless the finger
    // first held still for LONG_PRESS_MS, which starts a drag in any
    // direction.
    const horizontal = makePan()
      .activeOffsetX([-DRAG_START_DISTANCE, DRAG_START_DISTANCE])
      .failOffsetY([-DRAG_START_DISTANCE, DRAG_START_DISTANCE]);
    const held = makePan().activateAfterLongPress(LONG_PRESS_MS);
    return Gesture.Race(horizontal, held, tap);
  }, [id, index, disabled, drag, onTap, onDragStart, onDragTarget, onDrop]);

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
        label: MOVE_ACTION_LABELS[a],
      })),
    ],
    [index, count],
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
    ? 'Picked. Double-tap again to cancel, or use the move actions.'
    : somethingPicked
      ? 'Double-tap to swap with the picked item.'
      : 'Double-tap to pick, then double-tap another to swap.';

  return (
    <GestureDetector gesture={gesture}>
      <View
        ref={node => {
          nodeRef.current = node;
          setRef(id, node);
        }}
        collapsable={false}
        onLayout={e => onTileLayout(id, e)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={itemAccessibilityLabel(label, noun, index, count)}
        accessibilityHint={hint}
        accessibilityState={{ selected: picked, disabled }}
        accessibilityActions={actions}
        onAccessibilityAction={handleAction}
        testID={`reorder-tile-${id}`}
        {...webKeyProps}
        style={[
          frameStyle,
          width !== undefined ? { width } : null,
          picked ? pickedStyle : null,
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
  onOrderChange,
  onStatusChange,
  disabled = false,
  gapX = layout === 'grid' ? 12 : 10,
  gapY = 12,
  style,
  testID,
}: ReorderableListProps<T>) {
  const theme = useTheme();
  const colors = theme.colors;

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
  };
  const dragRef = useRef(drag);
  const stableDrag = dragRef.current;

  // ---- Measuring. Rects are in the container's coordinates, in order.
  const containerRef = useRef<View>(null);
  const rectById = useRef<Record<string, Rect>>({});
  const tileRefs = useRef<Record<string, View | null>>({});

  const publishRects = useCallback(() => {
    stableDrag.rects.value = orderRef.current.map(
      id => rectById.current[id] ?? { x: 0, y: 0, width: 0, height: 0 },
    );
  }, [stableDrag]);

  const onTileLayout = useCallback(
    (id: string, e: LayoutChangeEvent) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      rectById.current[id] = { x, y, width, height };
      publishRects();
    },
    [publishRects],
  );

  // onLayout does not fire on the web when a tile only changes position
  // (react-native-web watches size), so re-measure every tile against the
  // container after each reorder and width change.
  const remeasure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    orderRef.current.forEach(id => {
      const node = tileRefs.current[id];
      if (!node) return;
      node.measureLayout(
        container,
        (x, y, width, height) => {
          rectById.current[id] = { x, y, width, height };
          publishRects();
        },
        () => undefined,
      );
    });
  }, [publishRects]);

  useEffect(() => {
    publishRects();
    const raf = requestAnimationFrame(remeasure);
    return () => cancelAnimationFrame(raf);
  }, [order, containerWidth, remeasure, publishRects]);

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
        announce(`${label} picked. Choose another to swap with.`);
        statusRef.current?.({ kind: 'picked', id, label });
      } else if (r.event === 'cancelled') {
        announce(`${label} put back.`);
        statusRef.current?.({ kind: 'idle' });
      } else {
        const a = byId[pickedRef.current as string]?.label ?? '';
        commitOrder(r.order);
        focusAfterMove.current = id;
        announce(swapAnnouncement(a, label, labelsOf(r.order)));
        statusRef.current?.({ kind: 'idle' });
      }
      pickedRef.current = r.picked;
      setPicked(r.picked);
    },
    [disabled, byId, announce, commitOrder, labelsOf],
  );

  const onMove = useCallback(
    (from: number, to: number) => {
      const current = orderRef.current;
      const id = current[from];
      if (id === undefined) return;
      const next = moveItem(current, from, to);
      commitOrder(next);
      focusAfterMove.current = id;
      announce(moveAnnouncement(byId[id]?.label ?? id, noun, to, labelsOf(next)));
    },
    [byId, noun, announce, commitOrder, labelsOf],
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

  const onDragStart = useCallback(
    (index: number) => {
      const id = orderRef.current[index];
      if (!id) return;
      if (pickedRef.current) {
        pickedRef.current = null;
        setPicked(null);
      }
      setDraggingId(id);
      statusRef.current?.({ kind: 'dragging', id, label: byId[id]?.label ?? id, target: null });
    },
    [byId],
  );

  const onDragTarget = useCallback(
    (index: number, gap: number) => {
      const id = orderRef.current[index];
      if (!id) return;
      statusRef.current?.({
        kind: 'dragging',
        id,
        label: byId[id]?.label ?? id,
        target: describeGap(index, gap, labelsOf(orderRef.current)),
      });
    },
    [byId, labelsOf],
  );

  const onDrop = useCallback(
    (index: number, gap: number) => {
      stableDrag.from.value = -1;
      stableDrag.gap.value = -1;
      setDraggingId(null);
      statusRef.current?.({ kind: 'idle' });
      if (gap < 0 || isNoopGap(index, gap)) return;
      onMove(index, targetIndexForGap(index, gap));
    },
    [stableDrag, onMove],
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
    );
    if (!r) return { opacity: 0, left: 0, top: 0, height: 0 };
    return { opacity: 1, left: r.x, top: r.y, height: r.height };
  });

  const draggingItem = draggingId ? byId[draggingId] : undefined;

  return (
    <View
      ref={containerRef}
      collapsable={false}
      testID={testID}
      accessibilityRole="list"
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
      style={[
        styles.container,
        { columnGap: gapX, rowGap: gapY },
        style,
      ]}>
      {order.map((id, index) => {
        const item = byId[id];
        if (!item) return null;
        const isPicked = picked === id;
        return (
          <Tile
            key={id}
            id={id}
            index={index}
            count={order.length}
            label={item.label}
            noun={noun}
            picked={isPicked}
            somethingPicked={picked !== null}
            ghost={draggingId === id}
            disabled={disabled}
            layout={layout}
            width={itemWidth}
            columns={columns}
            frameStyle={frameStyle}
            pickedStyle={pickedStyle}
            ghostStyle={ghostStyle}
            drag={stableDrag}
            onTap={onTap}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragTarget={onDragTarget}
            onDrop={onDrop}
            onKey={onKey}
            onTileLayout={onTileLayout}
            setRef={setRef}>
            {layout === 'inline' ? (
              <View style={styles.inlineContent}>
                <GripGlyph color={isPicked ? colors.primary : colors.placeholder} />
                {renderItem(item, { index, count: order.length, picked: isPicked, lifted: false })}
              </View>
            ) : (
              renderItem(item, { index, count: order.length, picked: isPicked, lifted: false })
            )}
          </Tile>
        );
      })}

      <Animated.View
        pointerEvents="none"
        style={[styles.caret, { backgroundColor: colors.primary }, caretStyle]}>
        <View style={[styles.caretDot, styles.caretDotTop, { backgroundColor: colors.primary }]} />
        <View style={[styles.caretDot, styles.caretDotBottom, { backgroundColor: colors.primary }]} />
      </Animated.View>

      {draggingItem ? (
        <Animated.View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[
            styles.lifted,
            frameStyle,
            {
              borderWidth: 2,
              borderColor: colors.primary,
              transform: [{ rotate: layout === 'inline' ? '-3deg' : '-2deg' }],
            },
            LIFTED,
            layout === 'inline' ? { paddingLeft: 8.5, paddingRight: 13.5 } : { padding: 6.5 },
            liftedStyle,
          ]}>
          {layout === 'inline' ? (
            <View style={styles.inlineContent}>
              <GripGlyph color={colors.placeholder} />
              {renderItem(draggingItem, {
                index: order.indexOf(draggingItem.id),
                count: order.length,
                picked: false,
                lifted: true,
              })}
            </View>
          ) : (
            renderItem(draggingItem, {
              index: order.indexOf(draggingItem.id),
              count: order.length,
              picked: false,
              lifted: true,
            })
          )}
        </Animated.View>
      ) : null}

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
