import { Column, FormInput, Divider, H2, Row } from '@/components';
import { QuestionOption } from '@/models';
import _ from 'lodash';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

interface FractionProps {
  questionoptionnumeratorvalue: string;
  questionoptionnumeratorisstatic?: boolean;

  questionoptiondenominatorvalue?: string;
  questionoptiondenominatorisstatic?: boolean;

  questionoptionisfraction: boolean;
  questionoptionistext?: boolean;
}

interface FracitionItemProps {
  options?: QuestionOption[];
  currentQuestionIndex: number;
}

const scene_one: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_two: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
  },
  {
    questionoptionnumeratorvalue: '',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_three: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '3',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
  },
  {
    questionoptionnumeratorvalue: '',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];
const scene_four: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
  },
  {
    questionoptionnumeratorvalue: '4',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_five: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '2',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: true,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '=',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_six: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '6',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '4',
    questionoptiondenominatorisstatic: true,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '=',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '2',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_seven: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: true,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '+',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '2',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '6',
    questionoptiondenominatorisstatic: true,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '=',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_eight: FractionProps[] = [
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: true,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '=',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: 'x',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
  {
    questionoptionnumeratorvalue: '=',
    questionoptionnumeratorisstatic: true,
    questionoptiondenominatorvalue: '',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: false,
    questionoptionistext: true,
  },
  {
    questionoptionnumeratorvalue: '1',
    questionoptionnumeratorisstatic: false,
    questionoptiondenominatorvalue: '3',
    questionoptiondenominatorisstatic: false,
    questionoptionisfraction: true,
  },
];

const scene_to_test = [
  scene_one,
  scene_two,
  scene_three,
  scene_four,
  scene_five,
  scene_six,
  scene_seven,
  scene_eight,
];

const KEY_WIDTH = 110;

export default function FractionItem({
  currentQuestionIndex,
  options,
}: FracitionItemProps) {
  const theme = useTheme();

  // if (_.isEmpty(option)) return <SizedBox.Large height />;

  const optionToRender = useMemo(
    // () => scene_to_test[currentQuestionIndex],
    () => options,
    [currentQuestionIndex],
  );

  // console.log('Current Index: ', currentQuestionIndex);
  // console.log('CurrentScene: ', optionToRender);

  const renderItem = (opt: QuestionOption, index: number) => {
    const {
      questionoptionisfraction,
      questionoptionistext,
      questionoptionnumeratorvalue,
      questionoptionnumeratorisstatic,
      questionoptiondenominatorvalue,
      questionoptiondenominatorisstatic,
    } = opt;

    // console.log('Option: ', index + 1);
    // console.log('%c==== Condition ====', 'color: orange;');
    // console.log('isFraction: ', questionoptionisfraction);
    // console.log('isText: ', questionoptionistext);
    // console.log('numerator IsStatic: ', questionoptionnumeratorisstatic);
    // console.log('numerator Value: ', questionoptionnumeratorvalue);
    // console.log('denominator IsStatic: ', questionoptiondenominatorisstatic);
    // console.log('denominator Value: ', questionoptiondenominatorvalue);

    if (questionoptionistext && questionoptionisfraction)
      return (
        <Column key={index} justifyContent="center">
          <H2 style={{ width: KEY_WIDTH / 2 }}>
            {questionoptionnumeratorvalue}
          </H2>
          <Divider
            height={theme.layouts.small}
            color={theme.colors.onSurface}
          />
          <H2 style={{ width: KEY_WIDTH / 2 }}>
            {questionoptionnumeratorvalue}
          </H2>
        </Column>
      );
    if (questionoptionistext)
      return (
        <H2 key={index} style={{ marginHorizontal: theme.layouts.medium }}>
          {questionoptionnumeratorvalue}
        </H2>
      );

    if (questionoptionisfraction)
      return (
        <Column key={index} justifyContent="center" alignItems="center">
          <FormInput
            noWrapper
            name={`selections.${opt.questionoptionid}.answer.numeratorAnswer`}
            disabled={questionoptionnumeratorisstatic}
            style={{
              width: KEY_WIDTH,
              fontSize: theme.fontSizes.h2,
              textAlign: 'center',
            }}
          />
          <Divider
            height={theme.layouts.small}
            color={theme.colors.onSurface}
          />
          <FormInput
            noWrapper
            name={`selections.${opt.questionoptionid}.answer.denominatorAnswer`}
            disabled={questionoptiondenominatorisstatic}
            style={{
              width: KEY_WIDTH,
              fontSize: theme.fontSizes.h2,
              textAlign: 'center',
            }}
          />
        </Column>
      );

    return (
      <FormInput
        noWrapper
        key={index}
        name={`selections.${opt.questionoptionid}.answer.numeratorAnswer`}
        // value={
        //   questionoptionnumeratorisstatic ? questionoptionnumeratorvalue : ''
        // }
        disabled={questionoptionnumeratorisstatic}
        style={{
          alignSelf: 'center',
          width: KEY_WIDTH,
          marginRight: theme.layouts.small,
          fontSize: theme.fontSizes.h2,
          textAlign: 'center',
        }}
      />
    );
  };

  return (
    <Row justifyContent="center" alignItems="center">
      {_.map(optionToRender, (opt, index) => renderItem(opt, index))}
    </Row>
  );
}
