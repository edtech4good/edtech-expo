import { Modal, View } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BlackVeil from './BlackVeil';
import Expanded from './layouts/Expanded';
import Row from './layouts/Row';
import FilledButton from './buttons/FilledButton';
import OutlineButton from './buttons/OutlineButton';
import AppButton from './ui/AppButton';
import SizedBox from './layouts/SizedBox';
import H5 from './texts/H5';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { ModalHandler, ModalState } from '@/models';
import { useTranslation } from 'react-i18next';
import { useDesign } from '@/services';

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
  const { isCorporate } = useDesign();
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
    return isCorporate ? (
      <AppButton label={t('button.ok')} onPress={onConfirm} fullWidth />
    ) : (
      <FilledButton onPress={onConfirm}>{t('button.ok')}</FilledButton>
    );
  };

  const PromptModalFooter = () => {
    if (isCorporate) {
      return (
        <Row>
          <Expanded>
            <AppButton
              label={t('button.no')}
              variant="secondary"
              onPress={onCancel}
              fullWidth
            />
          </Expanded>
          <SizedBox.Large width />
          <Expanded>
            <AppButton
              label={t('button.yes')}
              onPress={onConfirm}
              fullWidth
            />
          </Expanded>
        </Row>
      );
    }
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

  const ModalContentChildren = (
    <>
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
    </>
  );

  if (isCorporate) {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        visible={visible}>
        <BlackVeil opacity={0.8} />
        <Expanded justifyContent="center">
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.dialog,
              padding: theme.layouts.large,
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              minHeight: 320,
              maxWidth: 560,
              width: '90%',
            }}>
            {ModalContentChildren}
          </View>
        </Expanded>
      </Modal>
    );
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      presentationStyle="overFullScreen"
      visible={visible}>
      <BlackVeil opacity={0.8} />
      <Expanded justifyContent="center">
        <ModalWrapper>{ModalContentChildren}</ModalWrapper>
      </Expanded>
    </Modal>
  );
});
