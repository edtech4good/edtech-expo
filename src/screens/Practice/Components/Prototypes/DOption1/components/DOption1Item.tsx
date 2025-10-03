import { Images } from '@/assets';
import { H4, SizedBox } from '@/components';
import { QuestionOption } from '@/models';
import { useResource } from '@/services';
import { Image } from 'expo-image';
import _ from 'lodash';
import { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  option?: QuestionOption;
  isSelected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export default function DOption1Item({
  option,
  isSelected = false,
  onPress = () => undefined,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const source = useResource(
    { name: _.get(option, 'questionoptionfile.filename', '') },
    [option],
  );

  const borderColor = useMemo(
    () => (isSelected ? theme.colors.primary : theme.colors.divider),
    [isSelected],
  );

  if (_.isEmpty(option))
    return (
      <SizedBox
        width={100 + theme.layouts.medium * 2}
        height={100 + theme.layouts.medium * 2}
        style={{
          borderRadius: theme.layouts.defaultRadius,
          borderStyle: 'dotted',
          borderColor: theme.colors.divider,
          borderWidth: theme.layouts.divider,
        }}
      />
    );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        borderRadius: theme.layouts.defaultRadius,
        borderWidth: theme.layouts.divider,
        borderColor: borderColor,
        backgroundColor: theme.colors.surface,
        padding: theme.layouts.medium,
      }}>
      {!_.isEmpty(source) && (
        <Image source={source} style={{ width: 100, height: 100 }} />
      )}
      {_.isEmpty(source) && <H4>{option.questionoptiontext}</H4>}
    </Pressable>
  );
}
