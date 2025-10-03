import { Images } from '@/assets';
import {
  Container,
  DefaultBackgroundImage,
  Expanded,
  FilledButton,
  H3,
  H5,
  H6,
  LayoutScrollView,
  Row,
  ScoreStamp,
  SizedBox,
  StudentProfileCard,
} from '@/components';
import { DashboardCardColors } from '@/constants';
import { useResult, useSelection } from '@/services';
import { router, useNavigation } from 'expo-router';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Platform } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function ResultScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { course, unit, lesson } = useSelection();
  const { result } = useResult();
  const { hasPassed, maxScore, percentage, score } = result;

  const randomizeIndex = useMemo(
    () => _.random(0, DashboardCardColors.length - 1),
    [],
  );

  const image = useMemo(
    () => (hasPassed ? Images.CorrectExpression : Images.IncorrectExpression),
    [hasPassed],
  );

  const title = useMemo(
    () =>
      hasPassed
        ? t('screen.result.passedTitle')
        : t('screen.result.failedTitle'),
    [hasPassed],
  );

  useEffect(() => {
    navigation.setOptions({ title: t('screen.result.header') });
  }, []);

  const handleFinishPress = () => {
    router.back();
  };

  return (
    <LayoutScrollView backgroundColor={theme.colors.surface}>
      <DefaultBackgroundImage />
      <Container
        backgroundColor="transparent"
        removeHeaderSize
        paddingLeft={theme.fontSizes.h5}
        paddingBottom={theme.fontSizes.h5}
        paddingRight={theme.fontSizes.h5}
        paddingTop={theme.fontSizes.h5}>
        <Expanded flexDirection="row">
          <StudentProfileCard />
          <SizedBox width={theme.fontSizes.h5} />

          <Expanded
            paddingLeft={theme.layouts.large}
            paddingRight={theme.layouts.large}>
            <SizedBox.Large height />
            {/* {image()} */}
            <Image
              source={image}
              style={{ width: 160, maxHeight: 160, resizeMode: 'contain' }}
            />
            <SizedBox.Large height />
            <H3 fontWeight="bold">{title}</H3>
            <SizedBox.Large height />
            {/* <SizedBox.Large height /> */}
            <Row justifyContent="space-around">
              <Expanded>
                <H6 fontWeight="semi" color={theme.colors.onSurfaceVariant}>
                  {course?.gradename}
                </H6>
                <SizedBox.Large height />
                {/* <SizedBox.Large height /> */}
                <Image
                  style={{ height: 120 }}
                  resizeMethod="resize"
                  resizeMode="contain"
                  source={DashboardCardColors[randomizeIndex].image}
                />
              </Expanded>
              <Expanded>
                <H6 fontWeight="semi" color={theme.colors.onSurfaceVariant}>
                  {unit?.levelname}
                </H6>
                <SizedBox.Large height />
                <ScoreStamp score={`${percentage.toFixed(2)}%`} />
              </Expanded>
              <Expanded>
                <H6 fontWeight="semi" color={theme.colors.onSurfaceVariant}>
                  {lesson?.lessonname}
                </H6>
                <SizedBox.Large height />
                {/* <SizedBox.Large height /> */}
                <H5 fontWeight="semi">{t('screen.result.scoreLabel')}</H5>
                <SizedBox.Small height />
                <H3
                  fontWeight="semi"
                  color={theme.colors.secondary}>{`${score}/${maxScore}`}</H3>
              </Expanded>
            </Row>
          </Expanded>
        </Expanded>

        {Platform.OS === 'web' && (
          <Row>
            <Expanded flex={3} />
            <Expanded justifyContent="flex-end">
              <FilledButton onPress={handleFinishPress}>
                {t('screen.result.finishButton')}
              </FilledButton>
            </Expanded>
          </Row>
        )}
      </Container>
    </LayoutScrollView>
  );
}
