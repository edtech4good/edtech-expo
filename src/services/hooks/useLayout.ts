import { useWindowDimensions } from 'react-native';
import { useTheme } from 'styled-components/native';

export default function useLayout() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
}
