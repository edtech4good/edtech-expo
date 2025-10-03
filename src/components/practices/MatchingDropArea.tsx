import { Images } from '@/assets';
import { DropAreaWrapper, Expanded, H6, Row } from '@/components';
import { DropAreaProps, QuestionOption } from '@/models';
import { useResource } from '@/services';
import { Audio } from 'expo-av';
import { Image } from 'expo-image';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import styled, { useTheme } from 'styled-components/native';

const DropArea = styled.View`
  width: 300px;
  height: 105px;
  border-width: ${props => props.theme.layouts.divider}px;
  border-style: dotted;
  border-color: ${props => props.theme.colors.secondary};
  justify-content: center;
  align-items: center;
`;

interface Props {
  option: QuestionOption;
  onLayout: (val: DropAreaProps) => void;
}

export default function MatchingDropArea({ option, onLayout }: Props) {
  const theme = useTheme();

  const source = useResource(
    // { name: _.get(option, 'questionoptionfile.filename', '') },
    { name: 'alice1.png' },
    [option],
  );

  const playbackObject = useMemo(() => new Audio.Sound(), []);

  useEffect(() => {
    if (_.isEmpty(source)) return;
    handleLoadAudio();

    return () => {
      playbackObject.unloadAsync();
    };
  }, [source]);

  const handleLoadAudio = async () => {
    await playbackObject.unloadAsync();
    await playbackObject.loadAsync(
      { uri: source },
      { shouldPlay: false, isLooping: false },
    );
  };

  console.log('Drop Area: ', source);
  const handlePlayAudio = async () => {
    if (_.isEmpty(option.questionoptionfile)) return;
    // const { sound: playbackObject } = await Audio.Sound.createAsync(
    //   {
    //     uri: source,
    //   },
    //   { shouldPlay: true },
    // );
    await playbackObject.playFromPositionAsync(0);
  };

  return (
    <Row
      backgroundColor={theme.colors.surface}
      borderRadius={theme.layouts.defaultRadius}
      paddingLeft={theme.layouts.large}
      paddingRight={theme.layouts.large}
      paddingBottom={theme.layouts.medium}
      paddingTop={theme.layouts.medium}>
      <Expanded justifyContent="center">
        {!_.isEmpty(option.questionoptionfile) &&
          _.get(option, 'questionoptionfile.filetype', 0) === 6 && (
            <Image
              source={source}
              style={{ height: 100, width: 200 }}
              contentFit="contain"
            />
          )}
        {!_.isEmpty(option.questionoptionfile) &&
          _.get(option, 'questionoptionfile.filetype', 0) !== 6 && (
            <Pressable onPress={handlePlayAudio}>
              <Image
                source={Images.SoundButton}
                style={{ width: 57, height: 57 }}
              />
            </Pressable>
          )}
        {_.isEmpty(option.questionoptionfile) &&
          !_.isEmpty(option.questionoptiontext) && (
            <H6 textAlign="left" alignSelf="flex-start">
              {option.questionoptiontext}
            </H6>
          )}
      </Expanded>
      <DropAreaWrapper id={option.questionoptionid} onLayout={onLayout}>
        <DropArea>
          <H6 color={theme.colors.placeholder}>Drag & Drop Here</H6>
        </DropArea>
      </DropAreaWrapper>
    </Row>
  );
}
