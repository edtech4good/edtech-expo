import { Images } from '@/assets';
import { DraggableWrapper, H4 } from '@/components';
import { DraggableHandler, DraggableProps, QuestionOption } from '@/models';
import _ from 'lodash';
import { forwardRef } from 'react';
import { Animated, Image } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  option: QuestionOption;
  position: Animated.ValueXY;
  onRelease: (val: DraggableProps<QuestionOption>) => void;
}

export default forwardRef<DraggableHandler, Props>(function MatchingItem(
  {
    option,
    position,
    onRelease = (val: DraggableProps<QuestionOption>) => undefined,
  }: Props,
  ref,
) {
  const theme = useTheme();

  return (
    <DraggableWrapper
      ref={ref}
      id={option.questionassociate.questionoptionid}
      position={position}
      style={{
        elevation: 7,
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 7,
        width: 300,
        height: 105,
        justifyContent: 'center',
      }}
      onRelease={onRelease}>
      {/* <Pressable onPress={() => console.log('Playing sound')}> */}
      {
        <Image
          source={Images.MatchingItemBackground}
          resizeMethod="resize"
          resizeMode="cover"
          style={{ width: 300, height: 105, position: 'absolute' }}
        />
      }
      {/* </Pressable> */}
      <H4
        color={theme.colors.onSecondary}
        fontWeight="semi"
        style={{ position: 'absolute' }}>
        {_.get(option, 'questionassociate.questionassociatetext', '')}
      </H4>
    </DraggableWrapper>
  );
});
