import { useFont } from '@/services';
import hexAlpha from '@/utils/hexAlpha';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export type QuizOptionState = 'default' | 'selected' | 'correct' | 'incorrect';

export interface QuizOptionProps {
  label: string;
  state: QuizOptionState;
  onPress?: () => void;
  disabled?: boolean;
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function XIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function QuizOption({
  label,
  state,
  onPress,
  disabled,
}: QuizOptionProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress || disabled) return;
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    if (!onPress || disabled) return;
    scale.value = withTiming(1, { duration: 100 });
  };

  // NOTE: per the design spec, the "selected" state's border deliberately
  // reuses colors.success (not colors.selection) — colors.selection is
  // reserved for the radio ring accent. Implemented literally as specified.
  let backgroundColor = theme.colors.surface;
  let borderColor = theme.colors.divider;
  let borderWidth = 1;

  if (state === 'selected') {
    borderColor = theme.colors.success;
    borderWidth = 2;
  } else if (state === 'correct') {
    backgroundColor = hexAlpha(theme.colors.success, 0.12);
    borderColor = theme.colors.success;
    borderWidth = 2;
  } else if (state === 'incorrect') {
    backgroundColor = hexAlpha(theme.colors.error, 0.12);
    borderColor = theme.colors.error;
    borderWidth = 2;
  }

  const isRinged = state === 'selected' || state === 'correct';
  const showTrailing = state === 'correct' || state === 'incorrect';
  const trailingColor =
    state === 'correct' ? theme.colors.success : theme.colors.error;

  const content = (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderRadius: theme.radii.card,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        animatedStyle,
      ]}>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: isRinged ? 6 : 1.5,
          borderColor: isRinged ? theme.colors.selection : theme.colors.outline,
        }}
      />
      <Text
        style={{
          flex: 1,
          marginLeft: 12,
          fontFamily,
          fontSize: 15,
          color: theme.colors.onSurface,
        }}>
        {label}
      </Text>
      {showTrailing && (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            marginLeft: 12,
            backgroundColor: trailingColor,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {state === 'correct' ? (
            <CheckIcon color={theme.colors.onPrimary} />
          ) : (
            <XIcon color={theme.colors.onPrimary} />
          )}
        </View>
      )}
    </Animated.View>
  );

  if (!onPress) {
    return <View accessibilityRole="text">{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{
        selected: state === 'selected' || state === 'correct',
        disabled: !!disabled,
      }}>
      {content}
    </Pressable>
  );
}
