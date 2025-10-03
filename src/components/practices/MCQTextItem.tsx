import { Expanded, H4, IconButton, SizedBox } from '@/components';
import { useResource } from '@/services';
import { Audio } from 'expo-av';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import styled, { useTheme } from 'styled-components/native';

interface RadioProps {
  isSelected?: boolean;
}

const Radio = styled.View.attrs<RadioProps>((props: RadioProps) => ({
  isSelected: props.isSelected ?? false,
}))`
  border-radius: 17px;
  border-width: 5px;
  width: 32px;
  height: 32px;
  background-color: ${props =>
    props.isSelected
      ? props.theme.colors.surface
      : props.theme.colors.background};
  border-color: ${props =>
    props.isSelected
      ? props.theme.colors.primary
      : props.theme.colors.background};
`;

const MCQWrapper = styled.Pressable.attrs<RadioProps>((props: RadioProps) => ({
  isSelected: props.isSelected ?? false,
}))`
  flex-direction: row;
  width: 100%;
  padding: ${props => props.theme.fontSizes.h4}px;
  border-width: ${props => props.theme.layouts.divider}px;
  border-radius: ${props => props.theme.layouts.defaultRadius}px;
  border-color: ${props =>
    props.isSelected
      ? props.theme.colors.primary
      : props.theme.colors.background};
  background-color: ${props => props.theme.colors.surface};
  margin-bottom: ${props => props.theme.layouts.large}px;
  align-items: center;
`;

interface MCQTextItemProps {
  isSelected?: boolean;
  text: string;
  audioUrl: string | undefined;
  onPress?: () => void;
  disabled?: boolean;
  isShowingAnswer?: boolean;
  isCorrect: boolean;
}

export default function MCQTextItem({
  text = 'Where are you from?',
  isSelected = false,
  audioUrl,
  onPress = () => undefined,
  disabled = false,
  isShowingAnswer = false,
  isCorrect,
}: MCQTextItemProps) {
  const theme = useTheme();

  const playbackObject = new Audio.Sound();
  const audioSource = useResource({ name: audioUrl ?? '' }, [audioUrl]);
  const highlight = useMemo(() => {
    if (isSelected) return true;
    if (isShowingAnswer && isCorrect) return true;
    return false;
  }, [isSelected, isShowingAnswer]);

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
    if (_.isEmpty(audioUrl)) return;
    // const playbackObject = new Audio.Sound();
    // const { sound: playbackObject } = await Audio.Sound.createAsync(
    //   { uri: audioSource },
    //   { shouldPlay: true },
    // );
    await playbackObject.playFromPositionAsync(0);
  };

  return (
    <MCQWrapper isSelected={highlight} disabled={disabled} onPress={onPress}>
      <Radio isSelected={highlight} />
      <SizedBox.Large width />
      <H4 textAlign="left">{text}</H4>
      <Expanded />
      {!_.isEmpty(audioUrl) && (
        <IconButton
          onPress={handlePlayAudio}
          icon="play-circle"
          iconColor={theme.colors.primary}
          iconSize={theme.fontSizes.h1}
        />
      )}
    </MCQWrapper>
  );
}
