import { useCallback, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import _ from 'lodash';

import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import { ReorderableList } from '@/components/drag';
import type { ReorderItem, ReorderStatus } from '@/components/drag';
import MovableTile from '@/components/kit/MovableTile';
import OptionAudioCircle from '@/components/kit/OptionAudioCircle';
import { useSmallText } from '@/components/kit/kitText';
import { tileFrameStyle } from '@/components/kit/tileStyle';
import { useReportAnswer } from '../useReportAnswer';
import type { QuestionBodyProps } from '../types';
import {
  correctOrder,
  evaluateImageOrdering,
  optionMedia,
  pictureLetter,
  pictureTileState,
  shuffleNotCorrect,
} from './imageOrderingLogic';
import { imageOrderingLayout } from './imageOrderingLayout';

interface PictureItem extends ReorderItem {
  option: QuestionOption;
}

const hasAudio = (o: QuestionOption) => !_.isEmpty(optionMedia(o).audioName);

/**
 * Picture ordering (template 6), for CorporateQuestionShell. Behaviour is
 * today's PracticeArrangeImage: the pictures are shuffled per attempt, the
 * learner reorders them (now by dragging, or by tapping two to swap), and
 * Submit is always available. Grading is shared with that renderer
 * (gradeArrangeImage), so the answer sent is the same.
 */
export default function ImageOrderingBody({
  question,
  tries,
  resetKey,
  resultState,
  disabled,
  marks,
  showAnswer,
  layout: shellLayout,
  report,
}: QuestionBodyProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  const anyAudio = questionOptions.some(hasAudio);

  // Reshuffled per attempt, as today (keyed on tries), and never starting in
  // the correct order. The letters (a picture with no caption is "Picture
  // B") follow this starting order, so they name the picture without telling
  // where it belongs, and they stay put while it is dragged.
  const shuffled = useMemo(
    () => shuffleNotCorrect(questionOptions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tries, questionOptions],
  );
  // Show answer swaps in the correct order, which also clears the learner's arrangement.
  const items: PictureItem[] = useMemo(() => {
    const letters: Record<string, string> = {};
    shuffled.forEach((o, i) => {
      letters[o.questionoptionid] = pictureLetter(i);
    });
    const shown = showAnswer ? correctOrder(questionOptions) : shuffled;
    return shown.map(o => ({
      id: o.questionoptionid,
      label:
        _.trim(o.questionoptiontext) ||
        t('corporate.imageOrdering.picture', { letter: letters[o.questionoptionid] }),
      option: o,
    }));
  }, [shuffled, showAnswer, questionOptions, t]);

  // A counter that follows `items`, so a reloaded question (new options, a
  // new array) starts a fresh list whatever the tries say.
  const itemsVersion = useRef(0);
  const version = useMemo(() => ++itemsVersion.current, [items]);

  // The list reports every change; until it does the order is the starting one.
  const [changed, setChanged] = useState<{ items: PictureItem[]; ids: string[] } | null>(null);
  const ids = changed && changed.items === items ? changed.ids : items.map(i => i.id);
  const onOrderChange = useCallback(
    (next: string[]) => setChanged({ items, ids: next }),
    [items],
  );

  // Always ready, as today: an untouched order grades like any other.
  useReportAnswer(report, true, () => evaluateImageOrdering(questionOptions, ids));

  const [status, setStatus] = useState<ReorderStatus>({ kind: 'idle' });
  const picked = status.kind === 'picked' || status.kind === 'dragging';

  // Size the pictures from the room the shell measured, less where the grid
  // starts inside the body (the instruction line above it). See
  // imageOrderingLayout. Hidden until the shell has measured.
  const [gridTop, setGridTop] = useState(0);
  const compact = shellLayout?.compact ?? false;
  const size = imageOrderingLayout({
    availableWidth: shellLayout?.availableWidth ?? 0,
    availableHeight: shellLayout?.availableHeight ?? 0,
    gridTop,
    count: items.length,
    compact,
  });

  const frameFor = useCallback(
    (item: PictureItem) => {
      const s = pictureTileState(item.id, {
        picked: false,
        lifted: false,
        marks,
        showAnswer,
      });
      return s === 'correct' || s === 'incorrect'
        ? tileFrameStyle(theme.colors, s)
        : undefined;
    },
    [marks, showAnswer, theme.colors],
  );

  // The instruction line, or what the learner is doing now. Not on a short
  // screen (compact) and not once there is nothing left to do (after Submit
  // or Show answer): it gives its room back. While it shows, two lines of
  // room are kept so picking a photo never moves the grid. The list itself
  // announces a pick, so the line is not a live region (it would be read twice).
  const hintShown = resultState === 'answering' && !compact;
  const hintText =
    status.kind === 'picked'
      ? t('corporate.imageOrdering.picked', { label: status.label })
      : status.kind === 'dragging'
        ? ''
        : t('corporate.imageOrdering.instruction');

  return (
    <View style={{ rowGap: compact ? 8 : 12, opacity: shellLayout ? 1 : 0 }}>
      {hintShown ? (
        <View
          style={{
            minHeight: small.lineHeight * 2 + 16,
            backgroundColor: picked ? theme.colors.primaryLight : 'transparent',
            borderRadius: 12,
            paddingHorizontal: picked ? 12 : 0,
            paddingVertical: picked ? 8 : 0,
            justifyContent: 'center',
          }}>
          <Text
            testID="image-ordering-hint"
            style={{
              fontFamily: small.fontFamily,
              fontSize: small.fontSize,
              lineHeight: small.lineHeight,
              color: picked ? theme.colors.onBackground : theme.colors.onSurfaceVariant,
            }}>
            {hintText}
          </Text>
        </View>
      ) : null}
      <View onLayout={e => setGridTop(e.nativeEvent.layout.y)}>
        <ReorderableList<PictureItem>
          // A new attempt, Show answer or a reloaded question starts a fresh arrangement.
          key={`${version}-${tries}-${resetKey}-${showAnswer ? 'answer' : 'play'}`}
          testID="image-ordering-grid"
          items={items}
          layout="grid"
          noun={t('reorder.noun.photo')}
          gapX={size.gap}
          gapY={size.gap}
          disabled={disabled}
          onOrderChange={onOrderChange}
          onStatusChange={setStatus}
          frameFor={frameFor}
          // The mark reaches a screen reader through the tile's label: the
          // tile's own content is inside the labelled button and is not read.
          itemStatusFor={item => {
            const s = pictureTileState(item.id, {
              picked: false,
              lifted: false,
              marks,
              showAnswer,
            });
            return s === 'correct'
              ? t('kit.mark.correct')
              : s === 'incorrect'
                ? t('kit.mark.incorrect')
                : undefined;
          }}
          renderItem={(item, state) => (
            <PictureTile
              item={item}
              position={state.index + 1}
              tileState={pictureTileState(item.id, {
                picked: state.picked,
                lifted: state.lifted,
                marks,
                showAnswer,
              })}
              imageHeight={size.imageHeight}
              reserveAudio={anyAudio}
            />
          )}
          renderAccessory={item => <PictureAudio item={item} />}
        />
      </View>
    </View>
  );
}

function PictureTile({
  item,
  position,
  tileState,
  imageHeight,
  reserveAudio,
}: {
  item: PictureItem;
  position: number;
  tileState: ReturnType<typeof pictureTileState>;
  imageHeight: number;
  reserveAudio: boolean;
}) {
  const imageSource = useResource(
    { name: optionMedia(item.option).imageName },
    [item.id],
  );
  // pointerEvents none: on the web a mouse press on an <img> starts the
  // browser's own image drag, which cancels the list's drag. Nothing in the
  // tile is interactive (the audio circle is a sibling), so the press goes
  // to the tile's button underneath.
  return (
    <View pointerEvents="none">
      <MovableTile
        inList
        variant="image"
        state={tileState}
        label={item.label}
        imageSource={imageSource}
        imageHeight={imageHeight}
        badge={position}
        reserveAudio={reserveAudio}
        testID={`image-order-tile-${item.id}`}
      />
    </View>
  );
}

function PictureAudio({ item }: { item: PictureItem }) {
  const audio = useResource(
    { name: optionMedia(item.option).audioName },
    [item.id],
  );
  if (!audio) return null;
  return (
    <OptionAudioCircle
      testID={`image-order-audio-${item.id}`}
      clipId={`option-${item.id}`}
      source={audio}
      label={item.label}
      placement="bottom-right"
    />
  );
}
