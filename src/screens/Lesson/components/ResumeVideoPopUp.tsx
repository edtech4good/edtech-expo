import {
  Column,
  Expanded,
  FilledButton,
  H3,
  H4,
  IconButton,
  OutlineButton,
  Row,
  SizedBox,
} from '@/components';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  header: string;
  onResume?: () => void;
  onClose?: () => void;
}

export default function ResumeVideoPopUp({
  header = '',
  onClose = () => undefined,
  onResume = () => undefined,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'column',
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.layouts.large * 2,
        borderRadius: theme.layouts.defaultRadius,
      }}>
      <H3 fontWeight="semi" color={theme.colors.primary}>
        {header}
      </H3>
      <H4 fontWeight="semi">
        Would you like to resume from your previous session?
      </H4>

      <SizedBox.Large height />
      <SizedBox.Large height />
      <Row>
        <Expanded>
          <OutlineButton onPress={onClose}>No</OutlineButton>
        </Expanded>
        <SizedBox.Large width />
        <Expanded>
          <FilledButton onPress={onResume}>Yes</FilledButton>
        </Expanded>
      </Row>
    </View>
  );
}
