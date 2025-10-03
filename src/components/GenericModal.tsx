import { Modal } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BlackVeil from './BlackVeil';
import Expanded from './layouts/Expanded';
import Row from './layouts/Row';
import FilledButton from './buttons/FilledButton';
import OutlineButton from './buttons/OutlineButton';
import SizedBox from './layouts/SizedBox';
import H5 from './texts/H5';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { ModalHandler, ModalState } from '@/models';
import { useTranslation } from 'react-i18next';

const ModalWrapper = styled.View`
  background-color: ${props => props.theme.colors.surface};
  border-radius: ${props => props.theme.layouts.defaultRadius}px;
  padding: ${props => props.theme.layouts.large}px;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  min-height: 320px;
  min-width: 528px;
`;

interface Props {
  type?: 'inform' | 'prompt';
  isVisible?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export default forwardRef<ModalHandler, Props>(function GenericModal(
  {
    type = 'inform',
    isVisible = false,
    onCancel = () => undefined,
    onConfirm = () => undefined,
  }: Props,
  ref,
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [{ message, visible }, setModalState] = useState<ModalState>({
    message: '',
    visible: false,
  });

  useImperativeHandle(ref, () => {
    return {
      hide() {
        setModalState(val => ({ ...val, visible: false }));
      },
      show(msg) {
        setModalState({ visible: true, message: msg });
      },
    };
  });

  const InformModalFooter = () => {
    return <FilledButton onPress={onConfirm}>{t('button.ok')}</FilledButton>;
  };

  const PromptModalFooter = () => {
    return (
      <Row>
        <Expanded>
          <OutlineButton onPress={onCancel}>{t('button.no')}</OutlineButton>
        </Expanded>
        <SizedBox.Large width />
        <Expanded>
          <FilledButton onPress={onConfirm}>{t('button.yes')}</FilledButton>
        </Expanded>
      </Row>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      presentationStyle="overFullScreen"
      visible={visible}>
      <BlackVeil opacity={0.8} />
      <Expanded justifyContent="center">
        <ModalWrapper>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={96}
            color={theme.colors.error}
          />
          <SizedBox.Large height />
          <H5 fontWeight="semi">{message}</H5>
          <SizedBox.Large height />
          <SizedBox.Large height />
          {type === 'inform' && InformModalFooter()}
          {type === 'prompt' && PromptModalFooter()}
        </ModalWrapper>
      </Expanded>
    </Modal>
  );
});
