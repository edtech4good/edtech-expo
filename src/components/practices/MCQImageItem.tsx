import { QuestionOption } from '@/models';
import OptionImage, { useOptionImageSlot } from './OptionImage';
import _ from 'lodash';
import styled, { useTheme } from 'styled-components/native';
import { useBreakpoint, useResource } from '@/services';
import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { imageTileSize } from '@/screens/Practice/Components/MCQImage/layout';

interface MCQImageItemProps {
  option: QuestionOption;
  isSelected?: boolean;
  disabled?: boolean;
  onPress?: (opt: QuestionOption) => void;
  isShowingAnswer?: boolean;
  index?: number;
}

interface MCQWrapperProps {
  isSelected?: boolean;
  disabled?: boolean;
}

const MCQImageItemWrapper = styled.Pressable.attrs<MCQWrapperProps>(props => ({
  isSelected: props.isSelected ?? false,
  disabled: props.disabled,
}))`
  border-width: ${props => props.theme.layouts.divider}px;
  border-radius: ${props => props.theme.layouts.defaultRadius}px;
  border-color: ${props =>
    props.isSelected ? props.theme.colors.primary : 'transparent'};
`;

/**
 * Side of a picture-choice tile (px), by breakpoint. Shared with the
 * renderer so its answer area can be sized from the tile instead of a
 * second copy of these numbers.
 */
export function useMCQImageTileSize(): number {
  const { height } = useWindowDimensions();
  const theme = useTheme();
  const breakpointSize = useBreakpoint({
    desktop: 256,
    tablet: 175,
    mobile: 150,
    phablet: 150,
  });
  return imageTileSize({
    breakpointSize,
    height,
    // Selection border either side, and room above and below (see
    // answerAreaMinHeight).
    reserve: 2 * theme.layouts.divider + 2 * theme.layouts.large,
  });
}

export default function MCQImageItem({
  option,
  isSelected = false,
  disabled = false,
  onPress = () => undefined,
  isShowingAnswer = false,
  index,
}: MCQImageItemProps) {
  const theme = useTheme();

  const itemWidth = useMCQImageTileSize();

  const imageSource = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option.questionoptionid],
  );

  const slot = useOptionImageSlot(imageSource, option.questionoptiontext);

  const highlightItem = useMemo(
    () => isShowingAnswer && option.questionoptioniscorrect,
    [isShowingAnswer, option],
  );

  const handleImagePress = () => {
    onPress(option);
  };

  return (
    <MCQImageItemWrapper
      testID={index !== undefined ? `answer-option-${index}` : undefined}
      isSelected={isSelected || highlightItem}
      disabled={disabled || isShowingAnswer}
      accessibilityRole="button"
      accessibilityLabel={slot.accessibilityLabel}
      aria-pressed={isSelected}
      accessibilityState={{
        selected: isSelected,
        disabled: disabled || isShowingAnswer,
      }}
      onPress={handleImagePress}>
      <OptionImage
        source={imageSource}
        slot={slot}
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
