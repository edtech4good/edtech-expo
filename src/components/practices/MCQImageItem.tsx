import { QuestionOption } from '@/models';
import { Image } from 'expo-image';
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

export default function MCQImageItem({
  option,
  isSelected = false,
  disabled = false,
  onPress = () => undefined,
  isShowingAnswer = false,
}: MCQImageItemProps) {
  const theme = useTheme();

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

  const highlightItem = useMemo(
    () => isShowingAnswer && option.questionoptioniscorrect,
    [isShowingAnswer, option],
  );

  const handleImagePress = () => {
    onPress(option);
  };

  return (
    <MCQImageItemWrapper
      isSelected={isSelected || highlightItem}
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
