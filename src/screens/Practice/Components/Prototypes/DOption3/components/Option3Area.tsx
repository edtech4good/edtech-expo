import { Images } from '@/assets';
import { BouncyWrapper, H3, H4, Row } from '@/components';
import { File, QuestionOption } from '@/models';
import { useResource } from '@/services';
import { Image } from 'expo-image';
import { useEffect } from 'react';
import { useController } from 'react-hook-form';
import { Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  onPress?: () => void;
  name: string;
  option: QuestionOption;
  questionItem: File;
}

export default function Option3Area({
  onPress = () => undefined,
  name,
  option,
  questionItem,
}: Props) {
  const theme = useTheme();
  const count = useController({ name });

  const source = useResource({ name: questionItem.filename }, [questionItem]);

  // useEffect(() => {
  //   console.log('My item counts: ', count.field.value);
  // }, [count]);

  const handlePress = () => {
    console.log('PRESSED ');
    if (!onPress) return;
    onPress();
  };

  return (
    <BouncyWrapper onPress={handlePress} animateOnPressIn animateOnPressOut>
      <Row
        style={{
          flexDirection: 'row',
          width: 200,
          height: 200,
          paddingHorizontal: theme.layouts.large,
          borderRadius: theme.layouts.defaultRadius,
          borderWidth: theme.layouts.divider,
          borderColor: theme.colors.divider,
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {count.field.value > 0 && (
          <Image
            source={source}
            style={{ width: 100, height: 100, resizeMode: 'contain' }}
          />
        )}
        {count.field.value > 1 && <H4>{` x ${count.field.value}`}</H4>}
      </Row>
    </BouncyWrapper>
  );
}
