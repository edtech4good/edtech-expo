import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export type StatusIconStatus = 'done' | 'inProgress' | 'todo' | 'upNext';

export interface StatusIconProps {
  status: StatusIconStatus;
  /** Overall square size (diameter for done/todo, ring diameter for inProgress). Default 28. */
  size?: number;
  testID?: string;
}

/**
 * Glanceable lesson/activity status glyph: a filled check disc (done), a
 * half-filled ring (inProgress), or an empty outline ring (todo).
 * Deliberately not a play triangle — a play glyph reads as "watch a video",
 * not "this is next." Presentation-only: the parent row (LessonRow /
 * ContinueLearningRow) carries the accessible label per F-05, so this is
 * hidden from the accessibility tree on every platform.
 */
export default function StatusIcon({
  status,
  size = 28,
  testID,
}: StatusIconProps) {
  const theme = useTheme();
  const center = size / 2;
  const resolvedTestID = testID ?? `status-icon-${status}`;

  if (status === 'done') {
    const checkSize = size * 0.64;
    const offset = (size - checkSize) / 2;
    return (
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        testID={resolvedTestID}>
        <Circle cx={center} cy={center} r={center} fill={theme.colors.success} />
        <Path
          d="M5 12.5L10 17.5L19 7"
          stroke={theme.colors.onSuccess}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          transform={`translate(${offset} ${offset}) scale(${checkSize / 24})`}
        />
      </Svg>
    );
  }

  if (status === 'upNext') {
    // v2: the up-next lesson gets a filled primary disc with a white
    // forward arrow — deliberately not a play triangle (that reads as
    // "watch a video," not "this is next"). Fixed 28-unit viewBox straight
    // from the handoff markup; react-native-svg scales it to `size`.
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        testID={resolvedTestID}>
        <Circle cx={14} cy={14} r={13} fill={theme.colors.primary} />
        <Path
          d="M8.5 14h11M15 9.5l4.5 4.5-4.5 4.5"
          stroke={theme.colors.onPrimary}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    );
  }

  if (status === 'inProgress') {
    // v2: copy the spec on a fixed 0 0 28 28 viewBox, same as `upNext` —
    // react-native-svg scales it to `size` via width/height, so the 24px
    // use in ContinueLearningRow still works. Half-disc fill on the right
    // with a white gap, not the previous computed-arc left half-disc.
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 28 28"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        testID={resolvedTestID}>
        <Circle
          cx={14}
          cy={14}
          r={12}
          fill={theme.colors.surface}
          stroke={theme.colors.primary}
          strokeWidth={2.5}
        />
        <Path d="M14 6.5a7.5 7.5 0 0 1 0 15z" fill={theme.colors.primary} />
      </Svg>
    );
  }

  // todo
  const strokeWidth = 2;
  const r = center - strokeWidth / 2;
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={resolvedTestID}>
      <Circle
        cx={center}
        cy={center}
        r={r}
        stroke={theme.colors.onSurfaceVariant}
        strokeWidth={strokeWidth}
        fill="none"
      />
    </Svg>
  );
}

export interface ChevronIconProps {
  size?: number;
  color: string;
  testID?: string;
}

/** Small shared "›" glyph used as the disclosure affordance in place of a play triangle. */
export function ChevronIcon({ size = 20, color, testID }: ChevronIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      testID={testID}>
      <Path
        d="M9 5l7 7-7 7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
