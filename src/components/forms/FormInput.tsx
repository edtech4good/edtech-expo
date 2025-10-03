import { useController } from 'react-hook-form';
import { KeyboardTypeOptions } from 'react-native/types';

import { BaseFormControlProps } from './Form';
import FormWrapper from './FormWrapper';
import CustomInput from '../CustomInput';

interface FormInputProps extends BaseFormControlProps {
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions | undefined;
  obscureText?: boolean;
  multiline?: boolean;
  noWrapper?: boolean;
}

export default function FormInput({
  name,
  defaultValue,
  rules = {},
  disabled = false,
  label,
  placeholder,
  keyboardType = 'default',
  obscureText = false,
  multiline = false,
  noWrapper = false,
  style,
}: FormInputProps) {
  const { field, fieldState } = useController({ name, rules, defaultValue });

  if (noWrapper)
    return (
      <CustomInput
        placeholder={placeholder}
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        errorMessage={fieldState.error?.message as string}
        disabled={disabled}
        keyboardType={keyboardType}
        obscureText={obscureText}
        multiline={multiline}
        style={style}
      />
    );
  return (
    <FormWrapper
      required={rules.required}
      label={label}
      errorMessage={fieldState.error?.type}>
      <CustomInput
        placeholder={placeholder}
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        errorMessage={fieldState.error?.message as string}
        disabled={disabled}
        keyboardType={keyboardType}
        obscureText={obscureText}
        multiline={multiline}
        style={style}
      />
    </FormWrapper>
  );
}
