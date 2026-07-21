import { QuestionOption } from '@/models';
import _ from 'lodash';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';
import Row from '../layouts/Row';
import H4 from '../texts/H4';
import { useMemo } from 'react';
import H5 from '../texts/H5';

interface Props {
  option: QuestionOption;
  selections: QuestionOption[];
  onPress?: (val: QuestionOption) => void;
  disabled?: boolean;
}

export default function FillBlankItem({
  option,
  selections,
  onPress = (val: QuestionOption) => undefined,
  disabled = false,
}: Props) {
  const theme = useTheme();

  const isSelected = useMemo(
    () =>
      !_.isEmpty(
        selections.filter(s => s.questionoptionid === option.questionoptionid),
      ),
    [option, selections],
  );

  const opacity = useMemo(() => (isSelected ? 0.5 : 1), [isSelected]);

  return (
    <Pressable
      key={option.questionoptionid}
      disabled={isSelected || disabled}
      style={{ opacity }}
      onPress={() => onPress(option)}>
      <Row
        backgroundColor={theme.colors.surface}
        borderRadius={theme.layouts.defaultRadius}
        paddingBottom={theme.layouts.medium}
        paddingLeft={theme.layouts.large}
        paddingRight={theme.layouts.large}
        paddingTop={theme.layouts.medium}
        style={{
          elevation: 7,
          shadowColor: theme.colors.shadow,
          shadowOffset: {
            width: 0,
            height: 0,
          },
          shadowOpacity: 0.25,
          shadowRadius: 7,
          marginRight: theme.layouts.large,
        }}>
        <H4>{option.questionoptiontext}</H4>
        {disabled && (
          <H4
            color={theme.colors.primary}
            style={{ position: 'absolute', top: 0, right: 0 }}>
            {option.questionoptionsequence}
          </H4>
        )}
      </Row>
    </Pressable>
  );
}
