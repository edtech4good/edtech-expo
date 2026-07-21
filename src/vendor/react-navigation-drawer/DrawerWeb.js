// Web-only replacement for @react-navigation/drawer's animated drawer
// (lib/module/views/modern/Drawer.js, v6.7.2), swapped in by metro.config.js.
//
// Why: on web the upstream drawer animates `translationX` with a reanimated
// spring. Reanimated on web advances springs one requestAnimationFrame tick at
// a time, so anything that interrupts the frame stream mid-flight — the tab
// being occluded/backgrounded, or React recreating DOM nodes during a
// navigation that lands mid-animation — strands the drawer at an arbitrary
// offset (the "residual translateX" bug: drawer sliver stuck on screen,
// invisible full-screen overlay still intercepting clicks because
// progress > 0, gap along the viewport edge until a reload repaints).
//
// Fix: on web there is no swipe gesture tracking the finger anyway
// (swipeEnabled defaults to false), so instead of a spring this sets
// `translationX` straight to its terminal value. With no mid-flight frames
// there is no state to strand: whenever the browser next paints, the drawer is
// exactly open or exactly closed, and the overlay's derived progress is
// exactly 1 or 0. Everything else is identical to upstream.
//
// If @react-navigation/drawer is upgraded, metro.config.js throws until this
// file is re-diffed against the new upstream Drawer.js.
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
import * as React from 'react';
import { I18nManager, InteractionManager, Keyboard, Platform, StatusBar, StyleSheet, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedGestureHandler, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated';
import DrawerProgressContext from '@react-navigation/drawer/lib/module/utils/DrawerProgressContext';
import { GestureState, PanGestureHandler } from '@react-navigation/drawer/lib/module/views/GestureHandler';
import Overlay from '@react-navigation/drawer/lib/module/views/modern/Overlay';
const SWIPE_DISTANCE_MINIMUM = 5;
const DEFAULT_DRAWER_WIDTH = '80%';
const minmax = (value, start, end) => {
  'worklet';

  return Math.min(Math.max(value, start), end);
};
export default function Drawer(_ref) {
  let {
    dimensions,
    drawerPosition,
    drawerStyle,
    drawerType,
    gestureHandlerProps,
    hideStatusBarOnOpen,
    keyboardDismissMode,
    onClose,
    onOpen,
    open,
    overlayStyle,
    renderDrawerContent,
    renderSceneContent,
    statusBarAnimation,
    swipeDistanceThreshold,
    swipeEdgeWidth,
    swipeEnabled,
    swipeVelocityThreshold,
    overlayAccessibilityLabel
  } = _ref;
  const getDrawerWidth = () => {
    const {
      width = DEFAULT_DRAWER_WIDTH
    } = StyleSheet.flatten(drawerStyle) || {};
    if (typeof width === 'string' && width.endsWith('%')) {
      // Try to calculate width if a percentage is given
      const percentage = Number(width.replace(/%$/, ''));
      if (Number.isFinite(percentage)) {
        return dimensions.width * (percentage / 100);
      }
    }
    return typeof width === 'number' ? width : 0;
  };
  const drawerWidth = getDrawerWidth();
  const isOpen = drawerType === 'permanent' ? true : open;
  const isRight = drawerPosition === 'right';
  const getDrawerTranslationX = React.useCallback(open => {
    'worklet';

    if (drawerPosition === 'left') {
      return open ? 0 : -drawerWidth;
    }
    return open ? 0 : drawerWidth;
  }, [drawerPosition, drawerWidth]);
  const hideStatusBar = React.useCallback(hide => {
    if (hideStatusBarOnOpen) {
      StatusBar.setHidden(hide, statusBarAnimation);
    }
  }, [hideStatusBarOnOpen, statusBarAnimation]);
  React.useEffect(() => {
    hideStatusBar(isOpen);
    return () => hideStatusBar(false);
  }, [isOpen, hideStatusBarOnOpen, statusBarAnimation, hideStatusBar]);
  const interactionHandleRef = React.useRef(null);
  const startInteraction = () => {
    interactionHandleRef.current = InteractionManager.createInteractionHandle();
  };
  const endInteraction = () => {
    if (interactionHandleRef.current != null) {
      InteractionManager.clearInteractionHandle(interactionHandleRef.current);
      interactionHandleRef.current = null;
    }
  };
  const hideKeyboard = () => {
    if (keyboardDismissMode === 'on-drag') {
      Keyboard.dismiss();
    }
  };
  const onGestureStart = () => {
    startInteraction();
    hideKeyboard();
    hideStatusBar(true);
  };
  const onGestureFinish = () => {
    endInteraction();
  };
  const hitSlop = isRight ? {
    right: 0,
    width: isOpen ? undefined : swipeEdgeWidth
  } : {
    left: 0,
    width: isOpen ? undefined : swipeEdgeWidth
  };
  const touchStartX = useSharedValue(0);
  const touchX = useSharedValue(0);
  const translationX = useSharedValue(getDrawerTranslationX(open));
  const gestureState = useSharedValue(GestureState.UNDETERMINED);
  const toggleDrawer = React.useCallback(_ref2 => {
    'worklet';

    let {
      open,
      isUserInitiated
    } = _ref2;
    const translateX = getDrawerTranslationX(open);
    touchStartX.value = 0;
    touchX.value = 0;
    // Upstream: translationX.value = withSpring(translateX, {...}).
    // Direct set — see the header comment for why web must not animate this.
    translationX.value = translateX;
    if (!isUserInitiated) {
      return;
    }
    if (open) {
      runOnJS(onOpen)();
    } else {
      runOnJS(onClose)();
    }
  }, [getDrawerTranslationX, onClose, onOpen, touchStartX, touchX, translationX]);
  React.useEffect(() => toggleDrawer({
    open,
    isUserInitiated: false
  }), [open, toggleDrawer]);
  const onGestureEvent = useAnimatedGestureHandler({
    onStart: (event, ctx) => {
      ctx.hasCalledOnStart = false;
      ctx.startX = translationX.value;
      gestureState.value = event.state;
      touchStartX.value = event.x;
    },
    onActive: (event, ctx) => {
      touchX.value = event.x;
      translationX.value = ctx.startX + event.translationX;
      gestureState.value = event.state;
      if (!ctx.hasCalledOnStart) {
        ctx.hasCalledOnStart = true;
        runOnJS(onGestureStart)();
      }
    },
    onEnd: event => {
      gestureState.value = event.state;
      const nextOpen = Math.abs(event.translationX) > SWIPE_DISTANCE_MINIMUM && Math.abs(event.translationX) > swipeVelocityThreshold || Math.abs(event.translationX) > swipeDistanceThreshold ? drawerPosition === 'left' ? (event.velocityX === 0 ? event.translationX : event.velocityX) > 0 : (event.velocityX === 0 ? event.translationX : event.velocityX) < 0 : open;
      toggleDrawer({
        open: nextOpen,
        isUserInitiated: true,
        velocity: event.velocityX
      });
    },
    onFinish: () => {
      runOnJS(onGestureFinish)();
    }
  });
  const translateX = useDerivedValue(() => {
    const touchDistance = drawerType === 'front' && gestureState.value === GestureState.ACTIVE ? minmax(drawerPosition === 'left' ? touchStartX.value - drawerWidth : dimensions.width - drawerWidth - touchStartX.value, 0, dimensions.width) : 0;
    const translateX = drawerPosition === 'left' ? minmax(translationX.value + touchDistance, -drawerWidth, 0) : minmax(translationX.value - touchDistance, 0, drawerWidth);
    return translateX;
  });
  const isRTL = I18nManager.getConstants().isRTL;
  const drawerAnimatedStyle = useAnimatedStyle(() => {
    const distanceFromEdge = dimensions.width - drawerWidth;
    return {
      transform: drawerType === 'permanent' ? [] : [{
        translateX: (drawerType === 'back' ? 0 : translateX.value) + (drawerPosition === 'left' ? isRTL ? -distanceFromEdge : 0 : isRTL ? 0 : distanceFromEdge)
      }]
    };
  });
  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: drawerType === 'permanent' ? [] : [{
        translateX: drawerType === 'front' ? 0 : translateX.value + drawerWidth * (drawerPosition === 'left' ? 1 : -1)
      }]
    };
  });
  const progress = useDerivedValue(() => {
    return drawerType === 'permanent' ? 1 : interpolate(translateX.value, [getDrawerTranslationX(false), getDrawerTranslationX(true)], [0, 1]);
  });
  return /*#__PURE__*/React.createElement(DrawerProgressContext.Provider, {
    value: progress
  }, /*#__PURE__*/React.createElement(PanGestureHandler, _extends({
    activeOffsetX: [-SWIPE_DISTANCE_MINIMUM, SWIPE_DISTANCE_MINIMUM],
    failOffsetY: [-SWIPE_DISTANCE_MINIMUM, SWIPE_DISTANCE_MINIMUM],
    hitSlop: hitSlop,
    enabled: drawerType !== 'permanent' && swipeEnabled,
    onGestureEvent: onGestureEvent
  }, gestureHandlerProps), /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.main, {
      flexDirection: drawerType === 'permanent' && !isRight ? 'row-reverse' : 'row'
    }]
  }, /*#__PURE__*/React.createElement(Animated.View, {
    style: [styles.content, contentAnimatedStyle]
  }, /*#__PURE__*/React.createElement(View, {
    accessibilityElementsHidden: isOpen && drawerType !== 'permanent',
    importantForAccessibility: isOpen && drawerType !== 'permanent' ? 'no-hide-descendants' : 'auto',
    style: styles.content
  }, renderSceneContent()), drawerType !== 'permanent' ? /*#__PURE__*/React.createElement(Overlay, {
    progress: progress,
    onPress: () => toggleDrawer({
      open: false,
      isUserInitiated: true
    }),
    style: overlayStyle,
    accessibilityLabel: overlayAccessibilityLabel
  }) : null), /*#__PURE__*/React.createElement(Animated.View, {
    removeClippedSubviews: Platform.OS !== 'ios',
    style: [styles.container, {
      position: drawerType === 'permanent' ? 'relative' : 'absolute',
      zIndex: drawerType === 'back' ? -1 : 0
    }, drawerAnimatedStyle, drawerStyle]
  }, renderDrawerContent()))));
}
const styles = StyleSheet.create({
  container: {
    top: 0,
    bottom: 0,
    maxWidth: '100%',
    width: DEFAULT_DRAWER_WIDTH
  },
  content: {
    flex: 1
  },
  main: {
    flex: 1,
    ...Platform.select({
      web: null,
      default: {
        overflow: 'hidden'
      }
    })
  }
});
