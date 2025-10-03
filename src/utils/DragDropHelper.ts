import numeral from 'numeral';
import { EdgeOffset, Offset } from '@/models';
import _ from 'lodash';
import { Animated } from 'react-native';

export const isPointInRect = (pointer: Offset, area: EdgeOffset) =>
  pointer.x >= area.minX &&
  pointer.x <= area.maxX &&
  pointer.y >= area.minY &&
  pointer.y <= area.maxY;

export const getDestOffset = (origin: Offset, destination: Offset) => {
  // console.log('=======> Dest <=======');
  // console.log('=>Origin: ', origin);
  // console.log('=>Destination: ', destination);
  if (_.isEmpty(origin) || _.isEmpty(destination)) return { x: 0, y: 0 };

  // To get the offset of the destination, you need the POS and Size of origin and POS of destination
  const xOffset = numeral(destination.x).subtract(origin.x).value() || 0;
  const yOffset = numeral(destination.y).subtract(origin.y).value() || 0;

  console.log('=> New Offset: ', { xOffset, yOffset });

  return { x: xOffset, y: yOffset };
};

export const animateToOffset = async (
  valueToAnimate: Animated.ValueXY,
  valueToBeAnimatedTo: Animated.ValueXY,
) => {
  return new Promise<void>(resolve => {
    Animated.spring(valueToAnimate, {
      toValue: valueToBeAnimatedTo,
      friction: 8,
      useNativeDriver: true,
    }).start(() => resolve());
  });
};

// export const
