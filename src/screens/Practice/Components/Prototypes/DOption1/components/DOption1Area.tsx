import { SizedBox } from '@/components';
import { useTheme } from 'styled-components/native';

export default function DOption1Area() {
  const theme = useTheme();
  return (
    <SizedBox
      height={100}
      width={100}
      style={{
        backgroundColor: theme.colors.surfaceVariant,
        borderRadius: theme.layouts.defaultRadius,
      }}
    />
  );
}
