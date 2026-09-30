import { QuestionOption } from '@/models';
import OptionImage, { useOptionImageSlot } from './OptionImage';
import _ from 'lodash';
import styled, { useTheme } from 'styled-components/native';
import { useBreakpoint, useResource } from '@/services';
import { useMemo } from 'react';

interface MCQImageItemProps {
  option: QuestionOption;
  isSelected?: boolean;
  disabled?: boolean;
  onPress?: (opt: QuestionOption) => void;
  isShowingAnswer?: boolean;
  index?: number;
  // Tile side; the renderer clamps it to the room it has. Defaults to the
  // breakpoint size.
  size?: number;
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

/** Side of a picture-choice tile (px) for the current width breakpoint. */
export function useMCQImageBreakpointSize(): number {
  return useBreakpoint({
    desktop: 256,
    tablet: 175,
    mobile: 150,
    phablet: 150,
  });
}

export default function MCQImageItem({
  option,
  isSelected = false,
  disabled = false,
  onPress = () => undefined,
  isShowingAnswer = false,
  index,
  size,
}: MCQImageItemProps) {
  const theme = useTheme();

  const breakpointSize = useMCQImageBreakpointSize();
  const itemWidth = size ?? breakpointSize;

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
