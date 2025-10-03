import { StyleProp, TextStyle } from 'react-native';

export interface BaseFormControlProps {
  name: string;
  label?: string | undefined;
  defaultValue?: string | number | Date | any[] | undefined;
  rules?: Omit<RegisterOptions<FieldValues, string>>;
  disabled?: boolean;
  labelAudioSource?: string;
  style?: StyleProp<TextStyle>;
}
