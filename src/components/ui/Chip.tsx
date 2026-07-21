import { useBreakpoint, useFont } from '@/services';
import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from 'styled-components/native';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
}

export default function Chip({
  label,
  active = false,
  onPress,
  icon,
}: ChipProps) {
  const theme = useTheme();
  const fontFamily = useFont('semi', 'body');
  const scale = useSharedValue(1);

  const height =
    useBreakpoint({
      desktop: 36,
      tablet: 36,
      phablet: 36,
      mobile: 32,
    }) ?? 36;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withTiming(0.97, { duration: 150 });
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withTiming(1, { duration: 150 });
  };

  const backgroundColor = active ? theme.colors.primary : theme.colors.surface;
  const labelColor = active ? theme.colors.onPrimary : theme.colors.onSurface;

  const content = (
    <Animated.View
      style={[
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 14,
          borderRadius: theme.radii.pill,
          backgroundColor,
          borderWidth: active ? 0 : 1,
          borderColor: theme.colors.divider,
        },
        animatedStyle,
      ]}>
      {icon}
      <Text
        style={{
          fontFamily,
          fontSize: 12,
          color: labelColor,
          marginLeft: icon ? 6 : 0,
        }}>
        {label}
      </Text>
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
      accessibilityRole="button"
      accessibilityState={{ selected: active }}>
      {content}
    </Pressable>
  );
}
