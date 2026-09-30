import { Images } from '@/assets';
import { DropAreaWrapper, Expanded, H6, OptionImage, Row } from '@/components';
import { DropAreaProps, QuestionOption } from '@/models';
import { useResource } from '@/services';
import { Image } from 'expo-image';
import _ from 'lodash';
import { Pressable } from 'react-native';
import styled, { useTheme } from 'styled-components/native';
import { useReplayClip } from '../kit/audio/useReplayClip';

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
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option],
  );
  // The option's audio on the shared player (one clip at a time). The
  // source used to be a hard-coded placeholder picture, so the sound button
  // loaded an image and played nothing.
  const clip = useReplayClip('match-option', source);

  const handlePlayAudio = async () => {
    if (_.isEmpty(option.questionoptionfile)) return;
    await clip.play();
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
            <OptionImage
              source={source}
              label={option.questionoptiontext}
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
