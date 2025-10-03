import { useController, useWatch } from 'react-hook-form';

import { BaseFormControlProps } from './Form';
import FormWrapper from './FormWrapper';
import PasswordInput from '../PasswordInput';

interface FormInputProps extends BaseFormControlProps {
  placeholder?: string;
}

export default function FormPassword({
  name,
  defaultValue,
  rules = {},
  disabled = false,
  label,
  placeholder,
}: FormInputProps) {
  const { field, fieldState } = useController({ name, rules, defaultValue });

  return (
    <FormWrapper
      required={rules.required}
      label={label}
      errorMessage={fieldState.error?.type}>
      <PasswordInput
        placeholder={placeholder}
        value={field.value}
        onChangeText={field.onChange}
        onBlur={field.onBlur}
        errorMessage={fieldState.error?.message as string}
        disabled={disabled}
      />
    </FormWrapper>
  );
}
