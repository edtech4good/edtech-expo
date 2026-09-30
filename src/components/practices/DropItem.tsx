import { DropItemHandler, DropitemProps, QuestionOption } from '@/models';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled, { useTheme } from 'styled-components/native';
import Row from '../layouts/Row';
import Expanded from '../layouts/Expanded';
import _ from 'lodash';
import H6 from '../texts/H6';
import { Image } from 'expo-image';
import OptionImage from './OptionImage';
import { Pressable } from 'react-native';
import { Images } from '@/assets';
import DragItem from './DragItem';
import { useBreakpoint, useResource } from '@/services';
import Column from '../layouts/Column';
import { useReplayClip } from '../kit/audio/useReplayClip';

const DropArea = styled.Pressable`
  width: 300px;
  height: 105px;
  border-width: ${props => props.theme.layouts.divider}px;
  border-style: dotted;
  border-color: ${props => props.theme.colors.secondary};
  justify-content: center;
  align-items: center;
  border-radius: ${props => props.theme.layouts.defaultRadius}px;
`;

interface DropItemProps extends DropitemProps {
  isShowingAnswer?: boolean;
}

export default forwardRef<DropItemHandler, DropItemProps>(function DropItem(
  { option, onPress, disabled = false, isShowingAnswer = false },
  ref,
) {
  const theme = useTheme();

  const source = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option],
  );

  const displayText = useMemo(
    () => _.get(option, 'questionoptiontext', 'Drop Here') || 'Drop Here',
    [option],
  );

  const [answer, setAnswer] = useState<QuestionOption | undefined>(undefined);
  const answerRef = useRef<QuestionOption | undefined>(undefined);
  answerRef.current = answer;

  const flexDirection = useBreakpoint({
    mobile: 'column',
    phablet: 'row',
    desktop: 'row',
    tablet: 'row',
  });

  // The option's audio on the shared player (one clip at a time).
  const clip = useReplayClip('drop-option', source);

  useImperativeHandle(
    ref,
    () => {
      return {
        select(val) {
          setAnswer(val);
        },
        deselect() {
          setAnswer(undefined);
        },
        retrieveValue() {
          return answerRef.current;
        },
      };
    },
    [],
  );

  useEffect(() => {
    if (!isShowingAnswer) setAnswer(undefined);
    else setAnswer(option);
  }, [isShowingAnswer]);

  const handlePlayAudio = async () => {
    if (_.isEmpty(option.questionoptionfile)) return;
    await clip.play();
  };

  if (flexDirection === 'column')
    return (
      <Column
        backgroundColor={theme.colors.surface}
        justifyContent="flex-start"
        alignItems="flex-start"
        borderRadius={theme.layouts.defaultRadius}
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}
        paddingBottom={theme.layouts.medium}
        paddingTop={theme.layouts.medium}
        style={{ flexDirection }}>
        <Expanded justifyContent="center" alignItems="flex-start">
          {!_.isEmpty(option.questionoptionfile) &&
            _.get(option, 'questionoptionfile.filetype', 0) === 6 && (
              <OptionImage
                source={source}
                label={option.questionoptiontext}
                style={{ height: 100, width: 200 }}
                contentFit="cover"
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
        <DropArea onPress={onPress} style={answer ? { borderWidth: 0 } : {}}>
          {answer === undefined && (
            <H6 color={theme.colors.placeholder}>{displayText}</H6>
          )}
          {answer !== undefined && (
            <DragItem disabled={true} option={answer} onPress={onPress} />
          )}
        </DropArea>
      </Column>
    );

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
              contentFit="cover"
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
      <DropArea onPress={onPress}>
        {answer === undefined && (
          <H6 color={theme.colors.placeholder}>
            {_.isEmpty(option.questionoptionfile) ? 'Drop Here' : displayText}
          </H6>
        )}
        {answer !== undefined && (
          <DragItem disabled={true} option={answer} onPress={onPress} />
        )}
      </DropArea>
    </Row>
  );
});
