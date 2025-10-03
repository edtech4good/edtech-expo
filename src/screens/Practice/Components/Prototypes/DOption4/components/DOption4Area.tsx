import { Row, SizedBox, StackImage } from '@/components';
import { QuestionOption } from '@/models';
import { useParentLayout } from '@/services';
import { KeyExtractorHelper } from '@/utils';
import _ from 'lodash';
import { useController } from 'react-hook-form';
import { FlatList, Pressable } from 'react-native';
import { useTheme } from 'styled-components/native';

interface Props {
  onPress: () => void;
}

const MAX_STACK = 10;

export default function DOption4Area({ onPress }: Props) {
  const theme = useTheme();
  const parentLayout = useParentLayout();

  const { field } = useController({ name: 'answers' });
  const { value } = field;

  if (!parentLayout) return <Row />;

  const renderItem = ({
    item,
  }: {
    item: { id: string; option: QuestionOption; value: number };
  }) => {
    return (
      <StackImage
        maxStackToDisplay={MAX_STACK}
        image={_.get(item, 'option.questionoptionfile.filename', '')}
        imageWidth={222}
        imageHeight={111}
        numOfStack={item.value}
      />
    );
  };

  const renderItemSeparator = () => <SizedBox.Large height />;

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: parentLayout.width - theme.layouts.large * 2,
        height: parentLayout.height - theme.layouts.large * 2,
      }}>
      <FlatList
        data={Object.values(value)}
        contentContainerStyle={{ paddingVertical: theme.layouts.large }}
        renderItem={renderItem}
        ItemSeparatorComponent={renderItemSeparator}
        keyExtractor={KeyExtractorHelper}
      />
    </Pressable>
  );
}
