import { useTypeRole } from '@/services';
import {
  hasImageSource,
  placeholderLabel,
  shouldShowPlaceholder,
} from '@/utils/optionImage';
import { Image, ImageProps } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ImageStyle,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import ImageOffIcon from '../ui/icons/ImageOffIcon';

/** Slots shorter than this drop the icon so a wrapped (Khmer) label has room. */
const SHORT_SLOT_HEIGHT = 120;
/** Border (1 + 1) plus the tile's vertical padding, subtracted before counting lines. */
const TILE_CHROME = 2;

export interface OptionImageSlot {
  source: string;
  showPlaceholder: boolean;
  onError: () => void;
  /** Text shown on the tile. */
  label: string;
  /**
   * For the tappable parent: the option text, else the generic string once the
   * tile is showing, else undefined (a loaded picture with no text has nothing to announce).
   */
  accessibilityLabel: string | undefined;
}

/**
 * State for one image slot. A tappable parent calls this itself and passes the
 * result to <OptionImage slot>, so it can carry the accessibility label on its
 * own Pressable (one focus stop) while the tile stays out of the a11y tree.
 */
export function useOptionImageSlot(
  source: string,
  text?: string | null,
): OptionImageSlot {
  const { t } = useTranslation();
  // Remember which source failed so a new source gets a fresh attempt.
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const showPlaceholder = shouldShowPlaceholder(source, failedSource);
  const label = placeholderLabel(text, t('image.unavailable'));
  const hasText = typeof text === 'string' && text.trim().length > 0;
  return {
    source,
    showPlaceholder,
    onError: () => setFailedSource(source),
    label,
    accessibilityLabel: hasText || showPlaceholder ? label : undefined,
  };
}

export interface OptionImageProps {
  /** Resolved image URI (from `useResource`); '' when the file is missing. */
  source: string;
  /** The option's `questionoptiontext`. Shown and announced when the picture is missing. */
  label?: string | null;
  /**
   * Pass when the image sits inside a tappable parent that carries the label
   * (see useOptionImageSlot). The tile then is not an accessible element.
   */
  slot?: OptionImageSlot;
  /** Layout of the slot; the placeholder tile fills exactly the same box as the image. */
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageProps['contentFit'];
  focusable?: boolean;
  testID?: string;
}

/**
 * An option or question picture that degrades to a labelled, neutral tile when
 * there is no file or the file fails to load (e.g. offline with an empty cache).
 * It handles no presses: the caller's Pressable wraps it, so selecting the tile
 * does exactly what selecting the picture does.
 */
export default function OptionImage({
  source,
  label,
  slot,
  style,
  contentFit = 'contain',
  focusable,
  testID,
}: OptionImageProps) {
  const theme = useTheme();
  const caption = useTypeRole('caption');
  const own = useOptionImageSlot(source, label);
  const s = slot ?? own;

  if (!s.showPlaceholder && hasImageSource(s.source)) {
    return (
      <Image
        source={s.source}
        focusable={focusable}
        contentFit={contentFit}
        onError={s.onError}
        style={style as ImageProps['style']}
        testID={testID}
      />
    );
  }

  const height = StyleSheet.flatten(style as StyleProp<ViewStyle>)?.height;
  const isShort = typeof height === 'number' && height < SHORT_SLOT_HEIGHT;
  // Keep the wrapped label inside the box: ellipsis instead of a clipped line.
  const numberOfLines =
    typeof height === 'number'
      ? Math.max(
          1,
          Math.floor(
            (height - TILE_CHROME - theme.layouts.small * 2) /
              caption.lineHeight,
          ),
        )
      : undefined;

  const inParent = slot !== undefined;

  return (
    <View
      testID={testID ? `${testID}-placeholder` : 'image-placeholder'}
      // Inside a tappable parent the parent is the single focus stop and
      // carries the label; a standalone tile is announced as an image.
      accessible={!inParent}
      importantForAccessibility={inParent ? 'no-hide-descendants' : 'auto'}
      aria-hidden={inParent ? true : undefined}
      accessibilityRole={inParent ? undefined : 'image'}
      accessibilityLabel={inParent ? undefined : s.label}
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
      {!isShort && <ImageOffIcon color={theme.colors.onSurfaceVariant} />}
      <Text
        numberOfLines={numberOfLines}
        ellipsizeMode="tail"
        style={{
          marginTop: isShort ? 0 : theme.layouts.small,
          maxWidth: '100%',
          textAlign: 'center',
          fontFamily: caption.fontFamily,
          fontSize: caption.fontSize,
          lineHeight: caption.lineHeight,
          // onSurface, not onSurfaceVariant: the latter is 4.12:1 on the kids
          // tile fill (< 4.5); onSurface is 12.7:1 kids, 10.7:1 corporate.
          color: theme.colors.onSurface,
        }}>
        {s.label}
      </Text>
    </View>
  );
}
