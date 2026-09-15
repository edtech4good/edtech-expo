import { QuestionOption } from '@/models';
import { Image } from 'expo-image';
import _ from 'lodash';
import styled, { useTheme } from 'styled-components/native';
import { useBreakpoint, useDesign, useResource } from '@/services';

interface MCQImageItemProps {
  option: QuestionOption;
  isSelected?: boolean;
  disabled?: boolean;
  onPress?: (opt: QuestionOption) => void;
  isShowingAnswer?: boolean;
  submitResult?: 'correct' | 'incorrect' | null;
}

interface MCQWrapperProps {
  borderColor: string;
  disabled?: boolean;
}

// The image tile has no tint/badge slot (unlike QuizOption), so the
// corporate correct/incorrect states are conveyed by border colour alone.
const MCQImageItemWrapper = styled.Pressable.attrs<MCQWrapperProps>(props => ({
  borderColor: props.borderColor,
  disabled: props.disabled,
}))`
  border-width: ${props => props.theme.layouts.divider}px;
  border-radius: ${props => props.theme.layouts.defaultRadius}px;
  border-color: ${props => props.borderColor};
`;

export default function MCQImageItem({
  option,
  isSelected = false,
  disabled = false,
  onPress = () => undefined,
  isShowingAnswer = false,
  submitResult = null,
}: MCQImageItemProps) {
  const theme = useTheme();
  const { isCorporate } = useDesign();

  const itemWidth = useBreakpoint({
    desktop: 256,
    tablet: 175,
    mobile: 150,
    phablet: 150,
  });

  const imageSource = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );

  const isCorrect = option.questionoptioniscorrect;

  // Kids: reproduces the pre-change behaviour exactly. Previously this
  // was `isSelected || (isShowingAnswer && isCorrect)` with selections
  // emptied on reveal; since the screen no longer clears selections on
  // reveal, the item must itself ignore the raw selection once the answer
  // is revealed. Kids does not read submitResult.
  const kidsHighlight = isShowingAnswer ? isCorrect : isSelected;
  const kidsBorder = kidsHighlight ? theme.colors.primary : 'transparent';

  // Corporate: a wrong pick keeps its error border through the result
  // popup and through reveal, while the correct option separately gets
  // the success border once revealed or once picked correctly. The
  // success border on a not-yet-revealed pick only appears when the
  // submission as a whole was correct (submitResult === 'correct'), so a
  // mixed wrong submission never leaks the answer via a green border.
  const isJudged = isShowingAnswer || submitResult !== null;
  const borderColor = !isCorporate
    ? kidsBorder
    : isShowingAnswer && isCorrect
    ? theme.colors.success
    : isJudged && isSelected && !isCorrect
    ? theme.colors.error
    : submitResult === 'correct' && isSelected && isCorrect
    ? theme.colors.success
    : isSelected
    ? theme.colors.primary
    : 'transparent';

  const handleImagePress = () => {
    onPress(option);
  };

  return (
    <MCQImageItemWrapper
      borderColor={borderColor}
      disabled={disabled || isShowingAnswer}
      onPress={handleImagePress}>
      <Image
        source={imageSource}
        contentFit="fill"
        style={{
          width: itemWidth,
          height: itemWidth,
          borderRadius: theme.layouts.defaultRadius,
        }}
      />
    </MCQImageItemWrapper>
  );
}
