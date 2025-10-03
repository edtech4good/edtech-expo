import { DropAreaProps, Measurement } from '@/models';
import numeral from 'numeral';
import { ReactNode, useRef } from 'react';
import { LayoutChangeEvent, StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  id: string;
  onLayout?: (val: DropAreaProps) => void;
  onMeasure?: () => undefined;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function DropAreaWrapper({
  id,
  onLayout = () => undefined,
  onMeasure = () => undefined,
  children,
  style,
}: Props) {
  const theme = useTheme();
  const viewRef = useRef<View>(null);

  const handleOnLayout = (_: LayoutChangeEvent) => {
    if (!viewRef.current) return;
    viewRef.current.measureInWindow((x, y, width, height) => {
      console.log(`%cOrigin: ${x} , ${y}`, 'color : yellow');
      onLayout({
        id,
        measurement: { height, width, x, y },
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
    <View ref={viewRef} style={style} onLayout={handleOnLayout}>
      {children && children}
    </View>
  );
}
