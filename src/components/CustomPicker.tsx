import { MaterialCommunityIcons } from '@expo/vector-icons';
import _ from 'lodash';
import { useMemo } from 'react';
import RNPickerSelect, { Item } from 'react-native-picker-select';
import { useTheme } from 'styled-components/native';

import Row from './layouts/Row';
import SizedBox from './layouts/SizedBox';
import H6 from './texts/H6';
import Expanded from './layouts/Expanded';

interface Props {
  placeholder?: string;
  value?: Item;
  onChange: (item: Item) => void;
  items: Item[];
  onClose?: () => void;
  disabled?: boolean;
}

export default function CustomPicker({
  items,
  onChange = Items => undefined,
  onClose = () => undefined,
  value,
  disabled,
  placeholder = 'Choose Class',
}: Props) {
  const theme = useTheme();
  const pickerItems = useMemo(() => items, [items]);

  const textColor = useMemo(
    () => (disabled ? theme.colors.divider : theme.colors.onSurface),
    [disabled],
  );

  const handleItemChange = (value: any, index: number) => {
    onChange(items[index - 1]);
  };

  return (
    <RNPickerSelect
      items={pickerItems}
      disabled={disabled}
      onClose={onClose}
      onValueChange={handleItemChange}
      placeholder={{
        label: placeholder ?? 'Select item',
        value: 'Select item',
        key: 'empty',
      }}
      useNativeAndroidPickerStyle={false}
      pickerProps={{
        accessibilityLabel: 'selectedItem.title',
      }}
      Icon={() => (
        <MaterialCommunityIcons
          name="chevron-down"
          size={theme.fontSizes.h4}
          color={textColor}
          style={{ marginRight: theme.layouts.large }}
        />
      )}
      style={{
        done: {
          color: theme.colors.primary,
        },
        chevron: {
          borderColor: theme.colors.primary,
        },
        modalViewMiddle: {
          backgroundColor: theme.colors.surface,
        },
        modalViewBottom: {
          backgroundColor: theme.colors.surfaceVariant,
        },
        inputAndroidContainer: {
          width: 232,
          alignSelf: 'stretch',
          borderWidth: theme.layouts.divider,
          height: theme.layouts.defaultComponentSize,
          justifyContent: 'center',
          borderColor: textColor,
          borderRadius: theme.layouts.defaultRadius,
          paddingLeft: theme.layouts.large,
          backgroundColor: theme.colors.surface,
          flexGrow: 1,
        },
        viewContainer: {
          backgroundColor: theme.colors.surface,
          height: theme.layouts.defaultComponentSize,
          maxHeight: theme.layouts.defaultComponentSize,
          justifyContent: 'center',
          borderWidth: theme.layouts.divider,
          borderColor: textColor,
          borderRadius: theme.layouts.defaultRadius,
          paddingLeft: theme.layouts.large,
          // width: '100%',
          flexShrink: 1.5,
          paddingRight: theme.layouts.defaultComponentSize,
          marginBottom: theme.layouts.large,
        },
        headlessAndroidContainer: {
          // width: '100%',
          alignSelf: 'stretch',
        },
        placeholder: {
          color: theme.colors.placeholder,
          fontSize: theme.fontSizes.h6,
        },
        inputWeb: {
          borderWidth: 0,
          marginRight: 16,
          fontSize: theme.fontSizes.h6,
          outlineStyle: 'none',
          backgroundColor: 'transparent',
          color: textColor,
          appearance: 'none',
        },
      }}>
      <Row style={{ width: '100%' }}>
        <H6>{_.get(value, 'label', placeholder)}</H6>
        <Expanded />
        {/* <SizedBox.Large width /> */}
        <MaterialCommunityIcons name="chevron-down" size={theme.fontSizes.h4} />
        <SizedBox.Medium width />
      </Row>
    </RNPickerSelect>
  );
}
