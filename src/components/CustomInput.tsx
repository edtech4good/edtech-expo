import _ from 'lodash';
import React, { useMemo } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  TextInput,
  TextInputProps,
} from 'react-native';
import { useTheme } from 'styled-components/native';
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

export default function CustomInput({
  disabled = false,
  errorMessage = '',
  placeholder = '',
  obscureText = false,
  keyboardType,
  multiline = false,
  onBlur = () => undefined,
  onFocus = () => undefined,
  onChangeText = () => undefined,
  style,
  value,
}: Props) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const fontFamily = useMemo(
    () =>
      selectedLanguage === 'en' ? 'PoppinsRegular' : 'NotoSansKhmerRegular',
    [selectedLanguage],
  );
  const componentStyle = useMemo(() => {
    if (!multiline)
      return {
        height: theme.layouts.defaultComponentSize,
        justifyContent: 'center',
      };
    else
      return {
        height: theme.layouts.defaultComponentSize * 2.5,
        justifyContent: 'flex-start',
        paddingTop: theme.layouts.medium,
      };
  }, [multiline]);

  const textInputStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? {
            outlineStyle: 'none',
          }
        : {},
    [],
  );

  const handleBlur = () => {
    onBlur();
  };

  const handleFocus = () => {
    onFocus();
  };

  return (
    <>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={obscureText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.placeholder}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={!disabled}
        style={{
          ...componentStyle,
          ...textInputStyle,
          alignSelf: 'stretch',
          backgroundColor: theme.colors.surface,
          color: theme.colors.onSurface,
          fontSize: theme.fontSizes.h6,
          fontFamily: fontFamily,
          paddingLeft: theme.layouts.pageHorizontalPadding,
          paddingRight: theme.layouts.pageHorizontalPadding,
          borderRadius: theme.layouts.defaultRadius,
          borderWidth: theme.layouts.divider,
          borderColor: theme.colors.outline,
          ...style,
        }}
      />
      {!_.isEmpty(errorMessage) && (
        <SH3 alignSelf="flex-end" color={theme.colors.error}>
          {errorMessage}
        </SH3>
      )}
    </>
  );
}
