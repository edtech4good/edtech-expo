import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'styled-components/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
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
  pictureTileState,
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
  resultState,
  disabled,
  marks,
  showAnswer,
  report,
}: QuestionBodyProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const small = useSmallText();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const { height: windowHeight } = useWindowDimensions();

  const questionOptions = useMemo(
    () => _.get(question, 'questionobject.questionoptions', []) as QuestionOption[],
    [question],
  );
  const anyAudio = questionOptions.some(hasAudio);

  // Reshuffled per attempt, as today (keyed on tries). Show answer swaps in
  // the correct order, which also clears the learner's arrangement.
  const items: PictureItem[] = useMemo(() => {
    const shown = showAnswer ? correctOrder(questionOptions) : _.shuffle(questionOptions);
    return shown.map(o => ({
      id: o.questionoptionid,
      label: o.questionoptiontext,
      option: o,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tries, showAnswer, questionOptions]);

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

  // Size the pictures from where the grid really starts (measured), so they
  // fit above the footer where the window allows. See imageOrderingLayout.
  const [containerWidth, setContainerWidth] = useState(0);
  const [gridTop, setGridTop] = useState<number | null>(null);
  const gridRef = useRef<View>(null);
  const layout = imageOrderingLayout({
    containerWidth,
    windowHeight,
    gridTop,
    tabBarHeight,
    count: items.length,
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

  const hintText =
    disabled || resultState !== 'answering'
      ? null
      : status.kind === 'picked'
        ? t('corporate.imageOrdering.picked', { label: status.label })
        : status.kind === 'dragging'
          ? null
          : t('corporate.imageOrdering.instruction');

  return (
    <View style={{ rowGap: 12 }}>
      {hintText ? (
        <View
          accessibilityLiveRegion="polite"
          style={
            picked
              ? {
                  backgroundColor: theme.colors.primaryLight,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }
              : { minHeight: 20 }
          }>
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
      <View
        ref={gridRef}
        onLayout={e => {
          setContainerWidth(e.nativeEvent.layout.width);
          // Where the grid starts in the window, taken at layout (before any
          // scrolling), which is what the fit needs.
          gridRef.current?.measureInWindow((_x, y) => {
            if (Number.isFinite(y)) setGridTop(y);
          });
        }}>
        <ReorderableList<PictureItem>
          // A new attempt or Show answer starts a fresh arrangement.
          key={`${tries}-${showAnswer ? 'answer' : 'play'}`}
          testID="image-ordering-grid"
          items={items}
          layout="grid"
          noun={t('reorder.noun.photo')}
          gapX={layout.gap}
          gapY={layout.gap}
          disabled={disabled}
          onOrderChange={onOrderChange}
          onStatusChange={setStatus}
          frameFor={frameFor}
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
              imageHeight={layout.imageHeight}
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
