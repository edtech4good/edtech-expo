import { Image, ImageProps, ImageSource, ImageStyle } from 'expo-image';
import { Pressable, StyleProp, ViewProps } from 'react-native';
import { useTheme } from 'styled-components/native';
import Row from './layouts/Row';
import _ from 'lodash';
import { useMemo, useState } from 'react';
import Expanded from './layouts/Expanded';
import H4 from './texts/H4';
import { useResource } from '@/services';

interface Props extends ViewProps {
  stackDirection?: 'left' | 'right';
  maxStackToDisplay?: number;
  numOfStack?: number;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageProps?: ImageProps;
  imageStyle?: StyleProp<ImageStyle>;
}

const STACK_GAP = 10;

export default function StackImage({
  stackDirection = 'right',
  maxStackToDisplay = 0,
  numOfStack = 5,
  imageHeight,
  imageWidth,
  image,
  imageStyle,
}: Props) {
  const theme = useTheme();

  const finalStackSize = useMemo(
    () =>
      maxStackToDisplay === 0
        ? numOfStack
        : Math.min(maxStackToDisplay, numOfStack),
    [maxStackToDisplay, numOfStack],
  );

  const stackWidth = useMemo(
    () => imageWidth + STACK_GAP * (finalStackSize - 1),
    [image, finalStackSize, imageWidth, imageHeight],
  );

  const source = useResource({ name: image }, [image]);

  const renderableImage = useMemo(
    () =>
      Array(finalStackSize)
        .fill(null)
        .map((_, index) => {
          return (
            <Image
              key={index}
              source={source}
              style={[
                imageStyle,
                {
                  width: imageWidth,
                  height: imageHeight,
                  resizeMode: 'contain',
                },
                {
                  position: 'absolute',
                  [stackDirection]: STACK_GAP * index,
                },
              ]}
            />
          );
        }),
    [image, finalStackSize],
  );

  const handlePress = () => {
    // setNum(val => val + 1);
  };

  return (
    <Pressable onPress={handlePress} disabled>
      <Row>
        <Row
          flexDirection="row"
          justifyContent="flex-start"
          style={{
            width: stackWidth,
            height: imageHeight,
          }}>
          {renderableImage}
        </Row>
        <H4>{` x ${numOfStack}`}</H4>
      </Row>
    </Pressable>
  );
}
