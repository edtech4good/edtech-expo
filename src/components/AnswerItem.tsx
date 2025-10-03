import { DraggableContext } from '@/services';
import { useContext, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function AnswerItem() {
  const theme = useTheme();
  const dragState = useContext(DraggableContext);
  const backgroundColor = useMemo(
    () =>
      dragState?.isDragging ? theme.colors.secondary : theme.colors.primary,
    [dragState?.isDragging],
  );

  return (
    <View
      style={{
        minHeight: 56,
        minWidth: 224,
        backgroundColor: backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text selectable={false}>Answer</Text>
    </View>
  );
}
