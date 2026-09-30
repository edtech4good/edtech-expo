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
import { CARD_FRAME, optionMediaNames } from './imageChoiceLogic';
import type { ImageOptionState } from './imageChoiceLogic';

export interface ImageChoiceCardProps {
  option: QuestionOption;
  index: number;
  count: number;
  /** Side of the square picture. */
  side: number;
  state: ImageOptionState;
  /** One answer (template 2, radio) or several (template 4, checkbox). */
  multi: boolean;
  /** The answer is being shown: the correct cards are announced as such. */
  showAnswer: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * One picture answer: the quiz-option card (r16, hairline, teal ring when
 * chosen, mint and orange result tints with a disc) around a square picture
 * and a caption row (radio, text, the 44pt audio circle). The picture keeps
 * today's fill fit in a square, and degrades to the labelled placeholder
 * when the file is missing.
 *
 * The audio circle is a sibling of the selecting Pressable, never inside it,
 * so a tap on it plays the clip and does not choose the option.
 */
export default function ImageChoiceCard({
  option,
  index,
  count,
  side,
  state,
  multi,
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

  const chosen = state === 'selected' || state === 'correct';
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
  const pad = CARD_FRAME - borderWidth;
  const showMark = state === 'correct' || state === 'incorrect';

  // What a screen reader hears: the option's text (or the placeholder's), and
  // after a result the mark, which the disc alone carries for sighted users.
  const base = slot.accessibilityLabel;
  const label =
    state === 'correct'
      ? t(showAnswer ? 'corporate.mcqImage.correctAnswer' : 'corporate.mcqImage.correct', {
          label: base ?? '',
        })
      : state === 'incorrect'
        ? t('corporate.mcqImage.incorrect', { label: base ?? '' })
        : base;

  return (
    <View
      style={{
        width: side + 2 * CARD_FRAME,
        borderRadius: theme.radii.card,
        borderWidth,
        borderColor,
        backgroundColor,
        padding: pad,
      }}>
      <Pressable
        testID={`answer-option-${index}`}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={multi ? 'checkbox' : 'radio'}
        accessibilityLabel={label}
        accessibilityState={{
          selected: chosen,
          checked: chosen,
          disabled,
        }}
        aria-posinset={index + 1}
        aria-setsize={count}>
        <View style={{ alignItems: 'center' }}>
          <OptionImage
            source={image}
            slot={slot}
            contentFit="fill"
            style={{ width: side, height: side, borderRadius: 10 }}
          />
          {showMark ? (
            <View style={{ position: 'absolute', top: 8, right: 8 }}>
              <ResultMark kind={state === 'correct' ? 'correct' : 'incorrect'} size={28} />
            </View>
          ) : null}
        </View>
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
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              borderWidth: chosen ? 6 : 1.5,
              borderColor: chosen ? theme.colors.selection : theme.colors.outline,
            }}
          />
          <Text
            style={{
              flex: 1,
              marginLeft: 10,
              fontFamily: small.fontFamily,
              fontSize: 14,
              lineHeight: small.km ? 24 : undefined,
              color: state === 'selected' ? theme.colors.selectionText : theme.colors.onSurface,
            }}>
            {option.questionoptiontext}
          </Text>
        </View>
      </Pressable>
      {audio ? (
        <View style={{ position: 'absolute', right: pad, bottom: pad + 2 }}>
          <OptionAudioCircle
            testID={`answer-option-audio-${index}`}
            clipId={`option-${option.questionoptionid}`}
            source={audio}
            label={option.questionoptiontext}
          />
        </View>
      ) : null}
    </View>
  );
}
