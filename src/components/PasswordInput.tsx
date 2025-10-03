import _ from 'lodash';
import React, { useMemo } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  TextInput,
  TextInputProps,
} from 'react-native';
import { useTheme } from 'styled-components/native';

import IconButton from './buttons/IconButton';
import Row from './layouts/Row';
import SH3 from './texts/SH3';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';

interface Props extends TextInputProps {
  disabled?: boolean;
  errorMessage?: string;
  placeholder?: string;
  obscureText?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  onChangeText?: (e: string) => void;
}

export default function PasswordInput({
  disabled = false,
  errorMessage = '',
  placeholder = '',
  keyboardType,
  multiline = false,
  onBlur = () => undefined,
  onFocus = () => undefined,
  onChangeText = () => undefined,
  value,
}: Props) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const fontFamily = useMemo(
    () =>
      selectedLanguage === 'en' ? 'PoppinsRegular' : 'NotoSansKhmerRegular',
    [selectedLanguage],
  );

  const textInputStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? {
            outlineStyle: 'none',
          }
        : {},
    [],
  );

  const [showPassword, setShowPassword] = React.useState(false);

  const handleBlur = () => {
    onBlur();
  };

  const handleFocus = () => {
    onFocus();
  };

  return (
    <>
      <Row
        alignSelf="stretch"
        borderRadius={theme.layouts.defaultRadius}
        style={{
          backgroundColor: theme.colors.surface,
          height: theme.layouts.defaultComponentSize,
          borderWidth: theme.layouts.divider,
          borderColor: theme.colors.outline,
          overflow: 'hidden',
        }}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showPassword}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          // editable={!disabled}
          readOnly={disabled}
          style={{
            ...textInputStyle,
            alignSelf: 'stretch',
            flex: 1,
            color: theme.colors.onSurface,
            fontSize: theme.fontSizes.h6,
            fontFamily,
            height: theme.layouts.defaultComponentSize,
            paddingLeft: theme.layouts.pageHorizontalPadding,
            backgroundColor: theme.colors.surface,
          }}
        />
        <IconButton
          iconColor={theme.colors.primary}
          paddingHorizontal={theme.layouts.pageHorizontalPadding}
          icon={showPassword ? 'eye-off' : 'eye'}
          onPress={() => setShowPassword(!showPassword)}
          style={{
            backgroundColor: theme.colors.surface,
            alignSelf: 'stretch',
          }}
        />
      </Row>
      {!_.isEmpty(errorMessage) && (
        <SH3 alignSelf="flex-end" color={theme.colors.error}>
          {errorMessage}
        </SH3>
      )}
    </>
  );
}
