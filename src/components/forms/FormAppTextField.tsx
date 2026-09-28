import { useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { TextInputProps } from 'react-native';
import { KeyboardTypeOptions } from 'react-native/types';

import { BaseFormControlProps } from './Form';
import AppTextField from '../ui/AppTextField';

interface FormAppTextFieldProps extends BaseFormControlProps {
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  testID?: string;
  errorTestID?: string;
}

/**
 * react-hook-form binding for the corporate AppTextField, mirroring what
 * FormInput does for the kids CustomInput. AppTextField draws its own label
 * and error row, so no FormWrapper here.
 *
 * `showErrorBorder` is always derived from `fieldState.error` (not just its
 * `message`) so a field can be marked with the 2px error border while
 * carrying no message of its own — the v2.1 login handoff's combined
 * server-auth-failure state borders both username and password but shows
 * the message once, under password (see LoginScreen's `setError('username',
 * { message: '' })`).
 *
 * `fieldState.error?.message` is always an i18n KEY, never pre-translated
 * text — react-hook-form freezes whatever string it's given at the moment
 * an error fires, so a translated string would stay in whatever language
 * was active then and not update on a later language switch. Translating
 * the key here, at render, means every validation message on a screen that
 * uses this field re-translates for free whenever the language changes
 * (this component's own `useTranslation()` re-renders it), with no extra
 * effect needed to re-push a translation. This is the only place callers
 * (LoginScreen's `required` rules and its server-error `setError` calls)
 * should rely on for translation — never pass a pre-translated string as a
 * field's `message`.
 */
export default function FormAppTextField({
  name,
  defaultValue,
  rules = {},
  disabled = false,
  label,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  autoFocus = false,
  autoCapitalize,
  textContentType,
  autoComplete,
  testID,
  errorTestID,
}: FormAppTextFieldProps) {
  const { field, fieldState } = useController({ name, rules, defaultValue });
  const { t } = useTranslation();
  const errorKey = fieldState.error?.message as string | undefined;

  return (
    <AppTextField
      label={label}
      placeholder={placeholder}
      value={field.value ?? ''}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={errorKey ? t(errorKey) : undefined}
      showErrorBorder={Boolean(fieldState.error)}
      disabled={disabled}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoFocus={autoFocus}
      autoCapitalize={autoCapitalize}
      textContentType={textContentType}
      autoComplete={autoComplete}
      testID={testID}
      errorTestID={errorTestID}
    />
  );
}
