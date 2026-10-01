import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import OptionImage, { useOptionImageSlot } from '@/components/practices/OptionImage';
import OptionAudioCircle, { OPTION_AUDIO_SIZE } from '@/components/kit/OptionAudioCircle';
import ResultMark from '@/components/kit/ResultMark';
import { useSmallText } from '@/components/kit/kitText';
import hexAlpha from '@/utils/hexAlpha';
import SelectionIndicator from './SelectionIndicator';
import {
  COMPACT_AUDIO_RESERVE,
  MCQ_COMPACT_CORNER_INSET,
  MCQ_COMPACT_FRAME,
} from '@/components/kit/compactTile';
import {
  compactCaptionShown,
  mcqCompactControlSize,
  mcqCompactMarkSize,
  optionAccessibleName,
  optionLetter,
  optionMediaNames,
} from './imageChoiceLogic';
import type { ImageOptionState } from './imageChoiceLogic';

export interface ImageChoiceCardProps {
  option: QuestionOption;
  index: number;
  count: number;
  /** Side of the square picture. */
  side: number;
  /** Border plus padding, each side (constant across states). */
  frame: number;
  /** A phone on its side: the caption sits on the picture. */
  compact: boolean;
  state: ImageOptionState;
  /** The learner's own selection (drives `checked` and the control), not the result. */
  selected: boolean;
  /** The control drawn: a radio (one answer) or a checkbox (several). */
  indicator: 'radio' | 'checkbox';
  role: 'radio' | 'checkbox';
  /** The answer is being shown: the correct cards are announced as such. */
  showAnswer: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * One picture answer: the quiz-option card (r16, hairline border, teal ring
 * when chosen, mint and orange result tints with a check or cross disc)
 * around a square picture and its caption (regular: a row under the picture
 * with the radio or checkbox; compact: the caption and the control on the
 * picture). The picture keeps today's fill fit in a square, and degrades to
 * the labelled placeholder when the file is missing.
 *
 * The audio circle is a sibling of the selecting Pressable, never inside it,
 * so a tap on it plays the clip and does not choose the option.
 */
export default function ImageChoiceCard({
  option,
  index,
  count,
  side,
  frame,
  compact,
  state,
  selected,
  indicator,
  role,
  showAnswer,
  disabled,
  onPress,
}: ImageChoiceCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();

  const names = optionMediaNames(option);
  const image = useResource({ name: names.image }, [option.questionoptionid]);
  const audio = useResource({ name: names.audio }, [option.questionoptionid]);
  const slot = useOptionImageSlot(image, option.questionoptiontext);
  const text = (option.questionoptiontext ?? '').trim();

  let backgroundColor = theme.colors.surface;
  let borderColor = theme.colors.divider;
  let borderWidth = 1;
  if (state === 'selected') {
    borderColor = theme.colors.success;
    borderWidth = 2;
  } else if (state === 'correct') {
    backgroundColor = hexAlpha(theme.colors.success, 0.1);
    borderColor = theme.colors.success;
    borderWidth = 2;
  } else if (state === 'incorrect') {
    backgroundColor = hexAlpha(theme.colors.error, 0.08);
    borderColor = theme.colors.error;
    borderWidth = 2;
  }
  const pad = frame - borderWidth;
  const showMark = state === 'correct' || state === 'incorrect';

  // The name a screen reader hears: the option's text, or "Picture B" when it
  // has none (by position, so it never says which is right). After a result
  // the mark is added to the name. `checked` below stays the learner's own
  // selection, so a revealed correct option is not read as checked.
  const name = optionAccessibleName({
    text,
    pictureName: t('corporate.mcqImage.picture', { letter: optionLetter(index) }),
    unavailable: slot.showPlaceholder ? t('image.unavailable') : null,
  });
  const label =
    state === 'correct'
      ? t(showAnswer ? 'corporate.mcqImage.correctAnswer' : 'corporate.mcqImage.correct', { label: name })
      : state === 'incorrect'
        ? t('corporate.mcqImage.incorrect', { label: name })
        : name;

  const captionSize = compact ? 12 : 14;
  const captionLine = small.km ? (compact ? 20 : 24) : undefined;
  const chosenText = state === 'selected' ? theme.colors.selectionText : theme.colors.onSurface;
  // Tiny tiles (the result strip on a short screen) get smaller controls and
  // no caption (see mcqCompactRects in components/kit/compactTile.ts).
  const tiny = compact && !compactCaptionShown(side);
  const markSize = compact ? mcqCompactMarkSize(side) : 28;
  const controlSize = compact ? mcqCompactControlSize(side) : 20;

  return (
    <View
      style={{
        width: side + 2 * frame,
        borderRadius: compact ? 12 : theme.radii.card,
        borderWidth,
        borderColor,
        backgroundColor,
        padding: pad,
      }}>
      <Pressable
        testID={`answer-option-${index}`}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={role}
        accessibilityLabel={label}
        // `checked` is the learner's own selection only (never the result), on
        // native (accessibilityState) and web (aria-checked) alike.
        accessibilityState={{ checked: selected, disabled }}
        aria-checked={selected}
        aria-posinset={index + 1}
        aria-setsize={count}>
        <View style={{ alignItems: 'center' }}>
          <OptionImage
            source={image}
            slot={slot}
            contentFit="fill"
            style={{ width: side, height: side, borderRadius: compact ? 8 : 10 }}
          />
          {showMark ? (
            <View
              style={{
                position: 'absolute',
                top: compact ? MCQ_COMPACT_CORNER_INSET : 8,
                right: compact ? MCQ_COMPACT_CORNER_INSET : 8,
              }}>
              <ResultMark
                testID={`answer-option-mark-${index}`}
                kind={state === 'correct' ? 'correct' : 'incorrect'}
                size={markSize}
              />
            </View>
          ) : null}
          {compact ? (
            <>
              <View style={{ position: 'absolute', top: MCQ_COMPACT_CORNER_INSET, left: MCQ_COMPACT_CORNER_INSET }}>
                <SelectionIndicator kind={indicator} checked={selected} size={controlSize} />
              </View>
              {/* Not on a tiny picture, nor on a missing one (its placeholder
                  already shows the text). */}
              {text && !tiny && !slot.showPlaceholder ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingLeft: 6,
                    // Clear of the audio circle in the bottom-right corner.
                    paddingRight: audio ? COMPACT_AUDIO_RESERVE : 6,
                    paddingVertical: 2,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                    backgroundColor: hexAlpha(theme.colors.surface, 0.92),
                  }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      fontFamily: small.fontFamily,
                      fontSize: captionSize,
                      lineHeight: captionLine,
                      textAlign: 'center',
                      color: chosenText,
                    }}>
                    {text}
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
        {compact ? null : (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              marginTop: 6,
              paddingLeft: 6,
              // Room for the audio circle, which sits over this corner.
              paddingRight: audio ? OPTION_AUDIO_SIZE + 6 : 6,
            }}>
            <SelectionIndicator kind={indicator} checked={selected} />
            <Text
              // Beside the audio circle there is little room: one line with an
              // ellipsis, never a word broken across lines under the circle.
              {...(audio ? { numberOfLines: 1, ellipsizeMode: 'tail' as const } : null)}
              style={{
                flex: 1,
                minWidth: 0,
                marginLeft: 10,
                fontFamily: small.fontFamily,
                fontSize: captionSize,
                lineHeight: captionLine,
                color: chosenText,
              }}>
              {text}
            </Text>
          </View>
        )}
      </Pressable>
      {audio ? (
        <View
          style={{
            position: 'absolute',
            // Compact: a 44 x 44 target in the card's bottom-right corner
            // (over the border, still inside the card), the disc flush in
            // the picture's corner.
            right: compact ? -borderWidth : pad,
            bottom: compact ? -borderWidth : pad + 2,
          }}>
          <OptionAudioCircle
            testID={`answer-option-audio-${index}`}
            clipId={`option-${option.questionoptionid}`}
            source={audio}
            label={text || name}
            // Compact: the small circle, so it never covers the mark.
            size={compact ? 'compact' : 'regular'}
            discInset={MCQ_COMPACT_FRAME}
          />
        </View>
      ) : null}
    </View>
  );
}
