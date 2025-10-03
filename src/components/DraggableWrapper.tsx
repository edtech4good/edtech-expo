import {
  DraggableHandler,
  DraggableProps,
  Offset,
  Question,
  QuestionOption,
} from '@/models';
import { DraggableContext } from '@/services';
import { animateToOffset, getDestOffset } from '@/utils';
import _ from 'lodash';
import numeral from 'numeral';
import {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

interface Props {
  id: string;
  position: Animated.ValueXY;
  children?: ReactNode;
  onLayout?: (val: DraggableProps<QuestionOption>) => void;
  onRelease?: (val: DraggableProps<QuestionOption>) => void;
  style?: StyleProp<ViewStyle>;
}

export default forwardRef<DraggableHandler, Props>(function DraggableWrapper(
  {
    id,
    position,
    onLayout = () => undefined,
    onRelease = () => undefined,
    children,
    style,
  }: Props,
  ref,
) {
  const viewRef = useRef<View>(null);
  const [disabled, setDisabled] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [originOffset, setOriginOffset] = useState<Offset | undefined>(
    undefined,
  );
  const originRef = useRef<Offset | undefined>(undefined);
  originRef.current = originOffset;

  const [currentOffset, setCurrentOffset] = useState<Offset | undefined>(
    undefined,
  );
  const [pointerOffset, setPointerOffset] = useState<Offset | undefined>(
    undefined,
  );

  useImperativeHandle(
    ref,
    () => {
      return {
        updateOffset: (updateOffset: boolean) =>
          handleGetMeasurement(updateOffset),
        resetPosition: goToOrigin,
        moveTo: moveToDestination,
      };
    },
    [],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: async () => {
          // console.log(
          //   `%cGranted: ${JSON.stringify(currentOffset)}`,
          //   'color:green;font-size:24px',
          // );
          position.extractOffset();
          setIsDragging(true);
          if (!viewRef.current) return;
          viewRef.current.measureInWindow((x, y, width, height) => {
            setCurrentOffset({ x, y });
          });
        },
        onPanResponderEnd: ({ nativeEvent }) => {
          setIsDragging(false);
          if (!viewRef.current) return;
          viewRef.current.measureInWindow((x, y, width, height) => {
            // console.log('HELLO : ', { x, y });
            setPointerOffset({ x: nativeEvent.pageX, y: nativeEvent.pageY });
            onRelease({
              id,
              isDragging: false,
              position,
              measurement: { height, width, x, y },
              pointerOffset: { x: nativeEvent.pageX, y: nativeEvent.pageY },
              origin: originOffset as Offset,
              currentOffset: currentOffset,
              edge: {
                minX: x,
                minY: y,
                maxX: numeral(x).add(width).value() as number,
                maxY: numeral(y).add(height).value() as number,
              },
            });
          });
        },
        onPanResponderMove: Animated.event(
          [
            null,
            {
              dx: position.x,
              dy: position.y,
            },
          ],
          {
            useNativeDriver: false,
          },
        ),
      }),
    [originOffset, currentOffset, id],
  );

  const handleGetMeasurement = async (updateOrigin: boolean) => {
    setDisabled(true);
    return new Promise<Offset>((resolve, reject) => {
      if (_.isEmpty(viewRef.current)) reject('View is not ready');
      viewRef.current?.measureInWindow((x, y) => {
        // setOriginOffset({ x, y });
        setCurrentOffset({ x, y });
        setDisabled(false);
        resolve({ x, y });
      });
    });
  };

  const goToOrigin = async () => {
    // console.log('Going to Origin');
    await setDisabled(true);
    const currentPosition = await handleGetMeasurement(true);
    // console.log('Current Position: ', currentPosition);
    // console.log('Origin Position: ', originOffset);
    if (!currentPosition || !originRef.current) return;
    position.extractOffset();
    const destination = getDestOffset(currentPosition, originRef.current);
    await animateToOffset(position, new Animated.ValueXY(destination));
    setDisabled(false);
  };

  const moveToDestination = async (dest: Offset) => {
    // console.log('Going to destination');
    setDisabled(true);
    const currentPosition = await handleGetMeasurement(true);
    // console.log('Current Position: ', currentPosition);
    if (!currentPosition || !dest) return;
    position.extractOffset();
    const destination = getDestOffset(currentPosition, dest);
    await animateToOffset(position, new Animated.ValueXY(destination));
    setDisabled(false);
  };

  const handleOnLayout = (_: LayoutChangeEvent) => {
    // console.log('%cDraggleWrapper onLayout called', 'color : orange');
    if (!viewRef.current) return;
    viewRef.current.measureInWindow((x, y, width, height) => {
      // console.log(`%cOrigin: ${x} , ${y}`, 'color : red');
      setOriginOffset({ x, y });
      setCurrentOffset({ x, y });
      onLayout({
        id,
        isDragging: false,
        position,
        measurement: { height, width, x, y },
        origin: { x, y },
        edge: {
          minX: x,
          minY: y,
          maxX: numeral(x).add(width).value() as number,
          maxY: numeral(y).add(height).value() as number,
        },
      });
    });
  };

  return (
    <Animated.View
      ref={viewRef}
      onLayout={handleOnLayout}
      style={[
        style,
        {
          transform: position.getTranslateTransform(),
        },
        isDragging ? { zIndex: 999 } : {},
      ]}
      {...panResponder.panHandlers}>
      <DraggableContext.Provider
        value={{
          id,
          position,
          origin: originOffset,
          isDragging,
          pointerOffset,
        }}>
        {children && children}
      </DraggableContext.Provider>
    </Animated.View>
  );
});
