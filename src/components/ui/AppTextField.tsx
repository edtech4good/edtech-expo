import React, { useMemo, useState } from 'react';
import {
  KeyboardTypeOptions,
  Platform,
  StyleProp,
  TextInputProps,
  TextStyle,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import styled, { useTheme } from 'styled-components/native';

import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useFont } from '@/services';

import AppIconButton from './AppIconButton';

export type AppTextFieldVariant = 'default' | 'search';

export interface AppTextFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  variant?: AppTextFieldVariant;
  keyboardType?: KeyboardTypeOptions;
  onBlur?: () => void;
  onFocus?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Forwarded to the underlying TextInput. Useful for dev/demo screens. */
  autoFocus?: boolean;
  /** iOS autofill hint, e.g. 'username' / 'password'. */
  textContentType?: TextInputProps['textContentType'];
  /** Android/web autofill hint, e.g. 'username' / 'password'. */
  autoComplete?: TextInputProps['autoComplete'];
  testID?: string;
  /**
   * When true, draws the 2px error border (and keeps focus/press semantics
   * from `error`) even if `error` itself is empty — used to mark a field as
   * part of a combined error state (e.g. a server auth failure) whose
   * message is shown under a different field. See the v2.1 login handoff:
   * both username and password get the error border, but the message
   * renders once, under password only.
   */
  showErrorBorder?: boolean;
  /** testID for the error message row (defaults to `${testID}-error`). */
  errorTestID?: string;
}

const HEIGHTS: Record<AppTextFieldVariant, number> = {
  default: 52,
  search: 44,
};
const BASE_HORIZONTAL_PADDING = 16;

function AlertGlyph({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Line
        x1={12}
        y1={7.5}
        x2={12}
        y2={13}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={16.3} r={1} fill={color} />
    </Svg>
  );
}

function SearchGlyph({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={11}
        cy={11}
        r={7}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Line
        x1={16.2}
        y1={16.2}
        x2={21}
        y2={21}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EyeGlyph({ color, open }: { color: string; open: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.8} />
      {!open && (
        <Line
          x1={4}
          y1={20}
          x2={20}
          y2={4}
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

const Container = styled.View`
  align-self: stretch;
`;

const Label = styled.Text<{ $fontFamily: string; $lineHeight?: number }>`
  font-family: ${p => p.$fontFamily};
  font-size: 13px;
  ${p => (p.$lineHeight ? `line-height: ${p.$lineHeight}px;` : '')}
  color: ${p => p.theme.colors.onSurfaceVariant};
  margin-bottom: 6px;
`;

const Field = styled.View<{
  $height: number;
  $radius: number;
  $backgroundColor: string;
  $borderColor: string;
  $borderWidth: number;
  $paddingHorizontal: number;
}>`
  flex-direction: row;
  align-items: center;
  align-self: stretch;
  min-height: ${p => p.$height}px;
  border-radius: ${p => p.$radius}px;
  background-color: ${p => p.$backgroundColor};
  border-width: ${p => p.$borderWidth}px;
  border-color: ${p => p.$borderColor};
  padding-horizontal: ${p => p.$paddingHorizontal}px;
`;

const Input = styled.TextInput<{ $fontFamily: string; $color: string }>`
  flex: 1;
  align-self: stretch;
  font-family: ${p => p.$fontFamily};
  font-size: 15px;
  color: ${p => p.$color};
`;

const ErrorRow = styled.View`
  flex-direction: row;
  align-items: flex-start;
  margin-top: 6px;
`;

const ErrorText = styled.Text<{
  $fontFamily: string;
  $fontSize: number;
  $lineHeight?: number;
}>`
  font-family: ${p => p.$fontFamily};
  font-size: ${p => p.$fontSize}px;
  ${p => (p.$lineHeight ? `line-height: ${p.$lineHeight}px;` : '')}
  color: ${p => p.theme.colors.error};
  margin-left: 4px;
  flex-shrink: 1;
`;

export default function AppTextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  secureTextEntry = false,
  variant = 'default',
  keyboardType,
  onBlur,
  onFocus,
  autoCapitalize = 'none',
  autoFocus,
  textContentType,
  autoComplete,
  testID,
  showErrorBorder = false,
  errorTestID,
}: AppTextFieldProps) {
  const theme = useTheme();
  const bodyFontFamily = useFont('normal', 'body');
  const labelFontFamily = useFont('semi', 'body');
  const selectedLanguage = useAppSelector(getSelectedLanguage);
  const isKhmer = selectedLanguage === 'km';
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(false);

  const hasErrorBorder = (Boolean(error) || showErrorBorder) && !disabled;
  const hasErrorMessage = Boolean(error) && !disabled;
  const isSearch = variant === 'search';

  const borderWidth = hasErrorBorder || isFocused ? 2 : 1;
  // Border grows outward by 1px/side; trim padding to match so text doesn't shift.
  const paddingHorizontal = BASE_HORIZONTAL_PADDING - (borderWidth - 1);

  const borderColor = disabled
    ? theme.colors.outline
    : hasErrorBorder
    ? theme.colors.error
    : isFocused
    ? theme.colors.primary
    : theme.colors.outline;

  const backgroundColor = disabled
    ? theme.colors.surfaceVariant
    : theme.colors.surface;

  // Disabled copy keeps the handoff's Muted; `placeholder` is now dark enough for real placeholder text (U-03).
  const textColor = disabled
    ? theme.colors.secondaryLight
    : theme.colors.onSurface;

  const showSecureToggle = secureTextEntry;
  const isObscured = secureTextEntry && !isSecureVisible;

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  // `outlineStyle` is a react-native-web-only escape hatch (suppresses the
  // browser focus ring, which we render ourselves via the border) with no
  // native TextStyle equivalent, hence the cast.
  const webOutlineStyle = useMemo(
    () =>
      Platform.OS === 'web'
        ? ({ outlineStyle: 'none' } as unknown as StyleProp<TextStyle>)
        : undefined,
    [],
  );

  return (
    <Container>
      {label && (
        <Label $fontFamily={labelFontFamily} $lineHeight={isKhmer ? 22 : undefined}>
          {label}
        </Label>
      )}
      <Field
        $height={HEIGHTS[variant]}
        $radius={isSearch ? theme.radii.pill : theme.radii.input}
        $backgroundColor={backgroundColor}
        $borderColor={borderColor}
        $borderWidth={borderWidth}
        $paddingHorizontal={paddingHorizontal}>
        {isSearch && (
          <View style={{ marginRight: 8 }}>
            <SearchGlyph color={theme.colors.placeholder} />
          </View>
        )}
        <Input
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.placeholder}
          editable={!disabled}
          secureTextEntry={isObscured}
          autoFocus={autoFocus}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          textContentType={textContentType}
          autoComplete={autoComplete}
          onFocus={handleFocus}
          onBlur={handleBlur}
          $fontFamily={bodyFontFamily}
          $color={textColor}
          style={webOutlineStyle}
          accessibilityState={{ disabled }}
        />
        {showSecureToggle && (
          <AppIconButton
            variant="plain"
            size={32}
            icon={
              <EyeGlyph
                color={theme.colors.placeholder}
                open={isSecureVisible}
              />
            }
            accessibilityLabel={isSecureVisible ? 'Hide text' : 'Show text'}
            onPress={() => setIsSecureVisible(v => !v)}
          />
        )}
      </Field>
      {hasErrorMessage && (
        <ErrorRow testID={errorTestID ?? (testID ? `${testID}-error` : undefined)}>
          <View style={{ marginTop: 4 }}>
            <AlertGlyph color={theme.colors.error} />
          </View>
          <ErrorText
            $fontFamily={labelFontFamily}
            $fontSize={isKhmer ? 13 : 12}
            $lineHeight={isKhmer ? 22 : undefined}>
            {error}
          </ErrorText>
        </ErrorRow>
      )}
    </Container>
  );
}
