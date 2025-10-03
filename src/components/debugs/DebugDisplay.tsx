import { useWindowDimensions } from 'react-native';
import SH3 from '../texts/SH3';
import { useTheme } from 'styled-components/native';
import Column from '../layouts/Column';
import { useBreakpoint } from '@/services';
import { useEffect } from 'react';
// import { useEffect } from 'react';
export default function DebugDisplay() {
  const theme = useTheme();
  const { width, height } = useWindowDimensions();
  const currentDisplay = useBreakpoint({
    desktop: 'Desktop',
    mobile: 'Mobile',
    phablet: 'Phablet',
    tablet: 'Tablet',
  });

  useEffect(() => {
    console.log('Current Dimension: ', { width, height });
  }, [width, height]);

  return (
    <Column
      justifyContent="flex-end"
      alignItems="flex-end"
      backgroundColor="transparent"
      pointerEvents="none"
      paddingRight={theme.layouts.large}
      paddingBottom={theme.layouts.large}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
      }}>
      <SH3
        alignSelf="flex-end"
        color={
          theme.colors.error
        }>{`Env: ${process.env.EXPO_PUBLIC_BASE_URL}`}</SH3>
      <SH3
        alignSelf="flex-end"
        color={
          theme.colors.error
        }>{`Resource Path: ${process.env.EXPO_PUBLIC_RESOURCE_PATH}`}</SH3>
      <SH3
        alignSelf="flex-end"
        color={theme.colors.error}>{`Width: ${width}`}</SH3>
      <SH3
        alignSelf="flex-end"
        color={theme.colors.error}>{`Height: ${height}`}</SH3>
      <SH3
        alignSelf="flex-end"
        color={theme.colors.error}>{`Display Type: ${currentDisplay}`}</SH3>
    </Column>
  );
}
