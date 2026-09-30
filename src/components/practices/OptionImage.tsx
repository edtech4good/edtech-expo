import { useFont } from '@/services';
import { hasImageSource, placeholderLabel } from '@/utils/optionImage';
import { Image, ImageProps } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageStyle, StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';
import ImageOffIcon from '../ui/icons/ImageOffIcon';

export interface OptionImageProps {
  /** Resolved image URI (from `useResource`); '' when the file is missing. */
  source: string;
  /** The option's `questionoptiontext`. Shown and announced when the picture is missing. */
  label?: string | null;
  /** Layout of the slot; the placeholder tile fills exactly the same box as the image. */
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  /** True when the surrounding element is pressable, so the tile is announced as a button. */
  tappable?: boolean;
  focusable?: boolean;
  testID?: string;
}

/**
 * An option or question picture that degrades to a labelled, neutral tile when
 * there is no file or the file fails to load (e.g. offline with an empty cache).
 * It renders no press handling of its own: the caller's Pressable wraps it, so
 * selecting the tile does exactly what selecting the picture does.
 */
export default function OptionImage({
  source,
  label,
  style,
  contentFit = 'contain',
  tappable = false,
  focusable,
  testID,
}: OptionImageProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const fontFamily = useFont('normal', 'body');
  // Remember which source failed so a new source gets a fresh attempt.
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (hasImageSource(source) && failedSource !== source) {
    return (
      <Image
        source={source}
        focusable={focusable}
        contentFit={contentFit}
        onError={() => setFailedSource(source)}
        style={style as ImageProps['style']}
        testID={testID}
      />
    );
  }

  const text = placeholderLabel(label, t('image.unavailable'));

  return (
    <View
      testID={testID ? `${testID}-placeholder` : 'image-placeholder'}
      accessible
      accessibilityRole={tappable ? 'button' : 'image'}
      accessibilityLabel={text}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.layouts.small,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: theme.colors.divider,
          borderRadius: theme.radii.imageWell,
        },
        style as StyleProp<ViewStyle>,
      ]}>
      <ImageOffIcon color={theme.colors.onSurfaceVariant} />
      <Text
        style={{
          marginTop: theme.layouts.small,
          maxWidth: '100%',
          textAlign: 'center',
          fontFamily,
          // 13/22: the Khmer floor and caption role (design v2.1); no fixed
          // height, so a longer Khmer label wraps instead of clipping.
          fontSize: 13,
          lineHeight: 22,
          color: theme.colors.onSurfaceVariant,
        }}>
        {text}
      </Text>
    </View>
  );
}
