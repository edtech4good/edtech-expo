import { useTheme } from 'styled-components/native';
import Row from '../layouts/Row';
import H3 from '../texts/H3';
import { QuestionHeading } from '@/models';
import Expanded from '../layouts/Expanded';
import SizedBox from '../layouts/SizedBox';
import { Image, Text } from 'react-native';
import { Images } from '@/assets';
import BaseButton from '../buttons/BaseButton';
import _ from 'lodash';
import { Audio } from 'expo-av';
import { useEffect, useMemo } from 'react';
import { useDesign, useFont, useResource } from '@/services';

interface Props {
  heading: QuestionHeading;
}

export default function PracticeHeading({ heading }: Props) {
  const theme = useTheme();
  const { isCorporate } = useDesign();
  const questionFontFamily = useFont('bold', 'display');

  console.log('Practice Heading: ', heading.headingtext);

  const playbackObject = useMemo(() => new Audio.Sound(), []);
  const audioSource = useResource(
    {
      name: _.get(heading, 'headingfile.filename', ''),
    },
    [heading],
  );

  useEffect(() => {
    if (_.isEmpty(audioSource)) return;
    handleLoadAudio();

    return () => {
      playbackObject.unloadAsync();
    };
  }, [audioSource]);

  const handleLoadAudio = async () => {
    await playbackObject.unloadAsync();
    await playbackObject.loadAsync(
      { uri: audioSource },
      { shouldPlay: false, isLooping: false },
    );
  };

  const handlePlayAudio = async () => {
    if (_.isEmpty(heading.headingfile)) return;
    // const { sound: playbackObject } = await Audio.Sound.createAsync(
    //   {
    //     uri: audioSource,
    //   },
    //   { shouldPlay: true },
    // );
    await playbackObject.playFromPositionAsync(0);
  };

  const gutter = isCorporate
    ? theme.layouts.pageHorizontalPadding
    : theme.layouts.large;

  return (
    <Row paddingLeft={gutter} paddingRight={gutter}>
      {!_.isEmpty(heading.headingfile) && (
        <BaseButton
          onPress={handlePlayAudio}
          backgroundColor={theme.colors.surface}
          borderRadius={theme.layouts.defaultRadius}
          style={{
            paddingHorizontal: theme.layouts.medium,
            alignSelf: 'stretch',
          }}>
          <Image source={Images.PlayButton} style={{ width: 57, height: 57 }} />
        </BaseButton>
      )}
      {!_.isEmpty(heading.headingfile) && <SizedBox.Large width />}
      <Expanded
        testID={isCorporate ? 'question-card' : undefined}
        backgroundColor={theme.colors.surface}
        // Corporate: r16 per the handoff's question card spec (kids keeps
        // the shared defaultRadius). The page background is white now, so
        // this white card needs its own edge — a 1px divider hairline,
        // corporate only (kids pages aren't white).
        borderRadius={isCorporate ? theme.radii.card : theme.layouts.defaultRadius}
        paddingBottom={theme.layouts.large}
        paddingTop={theme.layouts.large}
        justifyContent="center"
        style={
          isCorporate
            ? { borderWidth: 1, borderColor: theme.colors.divider }
            : undefined
        }>
        {isCorporate ? (
          <Text
            style={{
              fontFamily: questionFontFamily,
              fontSize: theme.fontSizes.subtitle,
              color: theme.colors.onBackground,
              textAlign: 'center',
            }}>
            {heading.headingtext}
          </Text>
        ) : (
          <H3 fontWeight="semi">{heading.headingtext}</H3>
        )}
      </Expanded>
    </Row>
  );
}
