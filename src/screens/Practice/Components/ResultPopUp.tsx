import { Images } from '@/assets';
import { Column, FilledButton, H3, H4, SizedBox } from '@/components';
import { useScreenDimension } from '@/services';
import { Image } from 'expo-image';
import _ from 'lodash';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useTheme } from 'styled-components/native';

export interface CustomMessage {
  correctMessage: string;
  incorrectMessage: string;
}

interface Props {
  isCorrect: boolean;
  showAnswer?: boolean;
  customMessages?: CustomMessage;
  onPress?: () => void;
}

export default function ResultPopUp({
  isCorrect = false,
  showAnswer = false,
  onPress = () => undefined,
  customMessages,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { windowWidth } = useScreenDimension();

  const correctMessage = useMemo(
    () =>
      _.get(
        customMessages,
        'correctMessage',
        t('screen.practice.correctMessage'),
      ),
    [customMessages],
  );

  const incorrectMessage = useMemo(
    () =>
      _.get(
        customMessages,
        'incorrectMessage',
        t('screen.practice.incorrectMessage'),
      ),
    [customMessages],
  );

  const header = useMemo(
    () =>
      isCorrect
        ? t('screen.practice.correctTitle')
        : t('screen.practice.incorrectTitle'),
    [isCorrect],
  );

  const description = useMemo(
    () => (isCorrect ? correctMessage : incorrectMessage),
    [isCorrect],
  );

  const image = useMemo(
    () => (isCorrect ? Images.CorrectExpression : Images.IncorrectExpression),
    [isCorrect],
  );

  const buttonText = useMemo(
    () =>
      showAnswer
        ? t('screen.practice.showAnswerButton')
        : t('screen.practice.incorrectButton'),
    [isCorrect],
  );

  const displayButtonText = useMemo(
    () => (isCorrect ? t('screen.practice.correctButton') : buttonText),
    [buttonText, isCorrect],
  );

  return (
    <View
      style={{
        flexDirection: 'column',
        borderRadius: theme.layouts.defaultRadius,
        padding: theme.layouts.large * 2,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        width: windowWidth / 3,
        minWidth: 356,
        maxWidth: 500,
      }}>
      <H3 fontWeight="semi" color={theme.colors.primary}>
        {header}
      </H3>
      <H4>{description}</H4>
      <SizedBox.Large height />
      <SizedBox.Large height />
      <SizedBox.Large height />
      {/* {image()} */}
      <Image
        source={image}
        style={{ width: 160, height: 160, resizeMode: 'contain' }}
      />
      <SizedBox.Large height />
      <SizedBox.Large height />
      <SizedBox.Large height />
      <FilledButton onPress={onPress}>{displayButtonText}</FilledButton>
    </View>
  );
}
