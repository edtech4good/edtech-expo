import { useFont } from '@/services';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from 'styled-components/native';

export type ToastType = 'success' | 'error';

export interface ToastProps {
  visible: boolean;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

const EASING = Easing.bezier(0.22, 1, 0.36, 1);

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

function ExclamationIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8v5M12 16.5v.01"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function Toast({
  visible,
  type,
  message,
  actionLabel,
  onAction,
  onDismiss,
  autoDismissMs = 3000,
}: ToastProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const fontFamily = useFont('semi', 'body');

  const translateY = useSharedValue(24);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 220, easing: EASING });
      opacity.value = withTiming(1, { duration: 220, easing: EASING });

      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }

    translateY.value = withTiming(24, { duration: 220, easing: EASING });
    opacity.value = withTiming(0, { duration: 220, easing: EASING });
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, autoDismissMs]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const iconBackground =
    type === 'success' ? theme.colors.success : theme.colors.error;

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 24 + insets.bottom,
          alignItems: 'center',
        },
        animatedStyle,
      ]}>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          maxWidth: 480,
          width: '92%',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.card,
          paddingVertical: 14,
          paddingHorizontal: 16,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 1,
          shadowRadius: 28,
          elevation: 8,
        }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: iconBackground,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {type === 'success' ? (
            <CheckIcon color={theme.colors.onPrimary} />
          ) : (
            <ExclamationIcon color={theme.colors.onPrimary} />
          )}
        </View>
        <Text
          style={{
            flex: 1,
            marginLeft: 12,
            fontFamily,
            fontSize: 13,
            color: theme.colors.onSurface,
          }}>
          {message}
        </Text>
        {actionLabel && onAction && (
          <Pressable onPress={onAction} accessibilityRole="button">
            <Text
              style={{
                marginLeft: 12,
                fontFamily,
                fontSize: 13,
                color: theme.colors.primary,
              }}>
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}
