import { Expanded, H4, IconButton, SizedBox } from '@/components';
import QuizOption, { QuizOptionState } from '../ui/QuizOption';
import { useDesign, useResource } from '@/services';
import { Audio } from 'expo-av';
import _ from 'lodash';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
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
  submitResult?: 'correct' | 'incorrect' | null;
  isCorrect: boolean;
}

export default function MCQTextItem({
  text = 'Where are you from?',
  isSelected = false,
  audioUrl,
  onPress = () => undefined,
  disabled = false,
  isShowingAnswer = false,
  submitResult = null,
  isCorrect,
}: MCQTextItemProps) {
  const theme = useTheme();
  const { isCorporate } = useDesign();

  const playbackObject = new Audio.Sound();
  const audioSource = useResource({ name: audioUrl ?? '' }, [audioUrl]);
  // The screen no longer clears selections on reveal, so once the answer
  // is revealed the kids item must itself ignore the raw selection and
  // highlight only the correct option — this reproduces the pre-change
  // behaviour exactly (previously selections were emptied on reveal, so
  // highlight == isCorrect on reveal and == isSelected otherwise). Kids
  // does not read submitResult.
  const highlight = useMemo(() => {
    return isShowingAnswer ? isCorrect : isSelected;
  }, [isSelected, isShowingAnswer, isCorrect]);

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

  if (isCorporate) {
    // Corporate color-pass: the option itself becomes the Phase 2
    // QuizOption (which adds a real incorrect state and the check/X
    // badges); the audio play button — which QuizOption has no slot
    // for — stays alongside so nothing is lost.
    // State persists after submit and through reveal: a wrong pick keeps
    // painting 'incorrect' while the result popup is up AND after reveal
    // (when the correct option separately paints 'correct'), since the
    // screen no longer wipes selections when isShowingAnswer flips true.
    // The 'correct' paint on a not-yet-revealed pick only appears when the
    // submission as a whole was correct (submitResult === 'correct'), so a
    // mixed wrong submission never leaks the answer via a green option.
    const isJudged = isShowingAnswer || submitResult !== null;
    const state: QuizOptionState =
      isShowingAnswer && isCorrect
        ? 'correct'
        : isJudged && isSelected && !isCorrect
        ? 'incorrect'
        : submitResult === 'correct' && isSelected && isCorrect
        ? 'correct'
        : isSelected
        ? 'selected'
        : 'default';

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          marginBottom: theme.layouts.large,
          gap: 8,
        }}>
        <View style={{ flex: 1 }}>
          <QuizOption
            label={text}
            state={state}
            disabled={disabled}
            onPress={onPress}
          />
        </View>
        {!_.isEmpty(audioUrl) && (
          <IconButton
            onPress={handlePlayAudio}
            icon="play-circle"
            iconColor={theme.colors.primary}
            iconSize={theme.fontSizes.h1}
          />
        )}
      </View>
    );
  }

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
