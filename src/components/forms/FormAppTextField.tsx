import { useController } from 'react-hook-form';
import { KeyboardTypeOptions } from 'react-native/types';

import { BaseFormControlProps } from './Form';
import AppTextField from '../ui/AppTextField';

interface FormAppTextFieldProps extends BaseFormControlProps {
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
}

/**
 * react-hook-form binding for the corporate AppTextField, mirroring what
 * FormInput does for the kids CustomInput. AppTextField draws its own label
 * and error row, so no FormWrapper here.
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
}: FormAppTextFieldProps) {
  const { field, fieldState } = useController({ name, rules, defaultValue });

  return (
    <AppTextField
      label={label}
      placeholder={placeholder}
      value={field.value ?? ''}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message as string | undefined}
      disabled={disabled}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoFocus={autoFocus}
    />
  );
}
