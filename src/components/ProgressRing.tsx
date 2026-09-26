import { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  /** 0..1. Values outside that range are clamped; NaN is treated as 0. */
  progress: number;
  /** Defaults to the theme's hairline `divider` (#E3E8EF corporate). */
  trackColor?: string;
  /** Defaults to the theme's `primary` (#0B5FFF corporate). */
  color?: string;
  /** Rendered centred inside the ring (e.g. the % label). */
  children?: ReactNode;
  /**
   * What the ring measures (e.g. "Overall progress"), so screen readers
   * announce context alongside the progressbar value instead of a bare
   * percentage.
   */
  accessibilityLabel?: string;
}

// Native replacement for the web-only DOM-<svg> circular progress bar
// package that used to crash React Native with "View config getter callback
// for component `path` must be a function". Draws a background track circle
// plus a progress arc via strokeDasharray/strokeDashoffset, rotated so the
// arc starts at 12 o'clock, with round caps. Renders on Android, iOS and web
// via react-native-svg.
export default function ProgressRing({
  size,
  strokeWidth,
  progress,
  trackColor,
  color,
  children,
  accessibilityLabel,
}: ProgressRingProps) {
  const theme = useTheme();
  const resolvedTrackColor = trackColor ?? theme.colors.divider;
  const resolvedColor = color ?? theme.colors.primary;
  const safeProgress = Number.isFinite(progress)
    ? Math.min(1, Math.max(0, progress))
    : 0;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safeProgress);
  const center = size / 2;

  return (
    <View
      accessibilityRole="progressbar"
      // With a label, make the ring one accessible element (label + value)
      // rather than letting the reader also stop on the centred % text.
      accessible={accessibilityLabel != null ? true : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(safeProgress * 100),
      }}
      style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          // Rotate so the arc starts at 12 o'clock instead of SVG's default
          // 3 o'clock, and grows clockwise.
          rotation={-90}
          originX={center}
          originY={center}
        />
      </Svg>
      {children != null && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {children}
        </View>
      )}
    </View>
  );
}
