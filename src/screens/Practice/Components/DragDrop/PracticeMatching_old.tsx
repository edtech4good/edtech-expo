import {
  Column,
  Container,
  Expanded,
  H3,
  MatchingDropArea,
  MatchingItem,
  PracticeFooter,
  PracticeHeading,
  Row,
  SizedBox,
} from '@/components';
import { useScreenDimension } from '@/services';
import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTheme } from 'styled-components/native';
import { Animated, ScrollView } from 'react-native';
import {
  DraggableHandler,
  DraggableProps,
  DropAreaProps,
  EdgeOffset,
  Offset,
  PracticeHandler,
  Question,
  QuestionHeading,
} from '@/models';
import _ from 'lodash';
import { isPointInRect } from '@/utils';
import { useForm } from 'react-hook-form';
import { PracticeProps } from '../../PracticeScreen';

export default forwardRef<PracticeHandler, PracticeProps>(
  function PracticeMatching(
    {
      onRetry = () => undefined,
      onSubmit = () => undefined,
      question,
      currentQuestionIndex,
      maxQuestion,
    },
    ref,
  ) {
    const theme = useTheme();
    const { unblockHeightWithoutHeader } = useScreenDimension();

    const questionOptions = useMemo(
      () => _.get(question, 'questionobject.questionoptions', []),
      [],
    );
    const dragItems = useMemo(() => _.shuffle(questionOptions), [question]);
    const matchingItemRefs = useRef<Record<string, DraggableHandler>>({});

    const matchingItemPos = useMemo<Record<string, Animated.ValueXY>>(
      () =>
        _.reduce(
          questionOptions,
          (result, value) => {
            result[value.questionoptionid] = new Animated.ValueXY({
              x: 0,
              y: 0,
            });
            return result;
          },
          {},
        ),
      [question],
    );

    const [dropAreaPos, setDropAreaPos] = useState<Record<string, EdgeOffset>>(
      {},
    );

    const methods = useForm<{
      tries: number;
      answers: Record<string, string>;
      pairing: Record<string, string>;
    }>({
      defaultValues: { tries: 1, answers: {}, pairing: {} },
    });

    useImperativeHandle(
      ref,
      () => {
        return {
          retry() {
            handleRetry();
          },
          submit() {},
        };
      },
      [],
    );

    const handleSubmit = () => {
      const answers = methods.getValues('answers');
      console.log('ALL : ', answers);
      const isCorrect = _.reduce(
        questionOptions,
        (result, value) => {
          console.log('Key: ', value.questionoptionid);
          console.log('Value: ', answers[value.questionoptionid]);
          if (
            _.isEmpty(answers[value.questionoptionid]) ||
            answers[value.questionoptionid] !== value.questionoptionid
          )
            result = false;

          return result;
        },
        true,
      );

      onSubmit(methods.getValues('tries'), isCorrect);
    };
    const handleRetry = () => {
      _.forEach(matchingItemRefs.current, mir => mir.resetPosition());
      methods.setValue('answers', {});
      methods.setValue('pairing', {});
      methods.setValue('tries', methods.getValues('tries') + 1);
    };

    const handleDropAreaLayout = (val: DropAreaProps) => {
      setDropAreaPos(prev => ({ ...prev, [val.id]: val.edge }));
    };

    const handleSetAnswerValue = async (dropAreaId = '', newOccupant = '') => {
      // Get current occupant
      const currentAreaOccupant = methods.getValues('answers')[dropAreaId];
      const newOccupantOldArea = methods.getValues('pairing')[newOccupant];

      // Clear current occupant pairing due to returning home
      if (!_.isEmpty(currentAreaOccupant)) {
        console.log('Clearing : ', currentAreaOccupant);
        console.log('Making way for: ', newOccupant);
        methods.setValue('pairing', {
          ...methods.getValues('pairing'),
          [currentAreaOccupant]: '',
          [newOccupant]: dropAreaId,
        });
      }
      // Add new drop area to occupant
      else {
        console.log('Nobody here> ', newOccupant);
        methods.setValue('pairing', {
          ...methods.getValues('pairing'),
          [newOccupant]: dropAreaId,
        });
      }

      if (newOccupantOldArea) {
        console.log('I was at : ', newOccupantOldArea);
        console.log('Now im at: ', dropAreaId);
        methods.setValue('answers', {
          ...methods.getValues('answers'),
          [newOccupantOldArea]: '',
          [dropAreaId]: newOccupant,
        });
      }
      // Set new occupant
      else {
        console.log('I was at home');
        methods.setValue('answers', {
          ...methods.getValues('answers'),
          [dropAreaId]: newOccupant,
        });
      }

      return currentAreaOccupant ?? '';
    };

    const handleClearPairing = async (occupant = '') => {
      // console.log('I AM CLEARING');
      const occupiedArea = methods.getValues('pairing')[occupant];
      if (occupiedArea)
        methods.setValue('answers', {
          ...methods.getValues('answers'),
          [occupiedArea]: '',
        });

      methods.setValue('pairing', {
        ...methods.getValues('pairing'),
        [occupant]: '',
      });
    };
    // const handleSetAnswer = (dropAreaId: string,)

    const handleDragItemRelease = async (val: DraggableProps<Question>) => {
      const { overlapPos, isOverlapped, overlapId } = _.reduce(
        dropAreaPos,
        (result, value, key) => {
          if (isPointInRect(val.pointerOffset as Offset, value)) {
            result.overlapPos = { x: value.minX, y: value.minY };
            result.isOverlapped = true;
            result.overlapId = key;
          }
          return result;
        },
        { overlapPos: { x: 0, y: 0 }, isOverlapped: false, overlapId: '' },
      );

      if (!val.currentOffset || !val.origin) return;

      if (isOverlapped) {
        matchingItemRefs.current[val.id].moveTo(overlapPos);
        const oldId = await handleSetAnswerValue(overlapId, val.id);
        if (oldId) matchingItemRefs.current[oldId].resetPosition();
      } else if (!isOverlapped) {
        matchingItemRefs.current[val.id].resetPosition();
        handleClearPairing(val.id);
      }
    };

    const renderDropAreas = () => {
      return _.map(questionOptions, qp => (
        <MatchingDropArea
          key={qp.questionoptionid ?? ''}
          option={qp}
          onLayout={handleDropAreaLayout}
        />
      ));
    };

    const renderDragItems = () => {
      return _.map(dragItems, di => (
        <Column key={di.questionoptionid}>
          <MatchingItem
            key={di.questionoptionid}
            ref={r => {
              if (!r) return;
              matchingItemRefs.current[di.questionoptionid] = r;
            }}
            option={di}
            position={matchingItemPos[di.questionoptionid]}
            onRelease={handleDragItemRelease}
          />
          <SizedBox.Large height />
        </Column>
      ));
    };

    return (
      <Container containerHeight={unblockHeightWithoutHeader}>
        <PracticeHeading
          heading={
            _.get(
              question,
              'questionobject.questionheading',
              {},
            ) as QuestionHeading
          }
        />
        <SizedBox.Large height />

        <ScrollView
          style={{ flex: 1, width: '100%' }}
          showsVerticalScrollIndicator={false}>
          <Expanded
            flexDirection="row"
            paddingLeft={theme.layouts.large}
            paddingRight={theme.layouts.large}>
            <Expanded
              // backgroundColor={theme.colors.surface}
              justifyContent="flex-start"
              flex={1.5}>
              {renderDropAreas()}
            </Expanded>
            <SizedBox.Large width />
            <Expanded
              backgroundColor={theme.colors.surface}
              paddingTop={theme.layouts.large}
              style={{ height: 121 * questionOptions.length + 32 }}>
              {!_.isEmpty(matchingItemPos) && renderDragItems()}
            </Expanded>
          </Expanded>
        </ScrollView>
        <SizedBox.Large height />
        <PracticeFooter
          currentQuestionIndex={currentQuestionIndex}
          maxQuestion={maxQuestion}
          onSubmit={handleSubmit}
          onRetry={handleRetry}
        />
      </Container>
    );
  },
);
