import { DraggableHandler, DraggableProps, QuestionOption } from '@/models';
import { forwardRef, useImperativeHandle, useMemo } from 'react';
import { Animated } from 'react-native';
import DraggableWrapper from '../DraggableWrapper';
import Row from '../layouts/Row';
import { useTheme } from 'styled-components/native';
import H4 from '../texts/H4';

interface Props {
  option: QuestionOption;
  disabled?: boolean;
  invisible?: boolean;
  position?: Animated.ValueXY;
  onRelease: (val: DraggableProps<QuestionOption>) => void;
}

export default forwardRef<DraggableHandler, Props>(function ArrangeItem(
  { option, disabled = false, invisible = false, onRelease }: Props,
  ref,
) {
  const theme = useTheme();
  const position = useMemo(
    () => new Animated.ValueXY({ x: 0, y: 0 }),
    [option],
  );
  const opacity = useMemo(() => (invisible ? 0 : 1), [invisible]);

  const handleOnRelease = (val: DraggableProps<QuestionOption>) => {
    onRelease({ ...val, value: option });
  };

  return (
    <DraggableWrapper
      ref={ref}
      id={option.questionoptionid}
      position={position}
      style={{
        elevation: 7,
        shadowColor: theme.colors.shadow,
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 7,
        marginRight: theme.layouts.large,
        opacity,
      }}
      onRelease={handleOnRelease}>
      <Row
        backgroundColor={theme.colors.surface}
        borderRadius={theme.layouts.defaultRadius}
        paddingBottom={theme.layouts.medium}
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}
        paddingTop={theme.layouts.medium}>
        <H4>{option.questionoptiontext}</H4>
      </Row>
    </DraggableWrapper>
  );
});
