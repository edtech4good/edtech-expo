import { useTheme } from 'styled-components/native';
import BaseText, { BaseTextProps } from './BaseText';
import { useAppSelector } from '@/redux';
import { getSelectedLanguage } from '@/redux/slices';
import { useMemo } from 'react';
import { fontFamilies, fontWeights } from '@/constants';
import { NativeSyntheticEvent, TextLayoutEventData } from 'react-native';

export interface ResizeTextProps extends BaseTextProps {}

export default function ResizeText(props: ResizeTextProps) {
  const theme = useTheme();
  const selectedLanguage = useAppSelector(getSelectedLanguage);

  const { fontFamily, fontWeight } = props;

  const textFontFamily = useMemo(
    () =>
      fontFamily ||
      `${fontFamilies[selectedLanguage]}${
        fontWeights[fontWeight || theme.fontWeights.h3]
      }`,
    [selectedLanguage, fontWeight, fontFamily],
  );

  const handleResizing = (e: NativeSyntheticEvent<TextLayoutEventData>) => {
    const { lines } = e.nativeEvent;
    console.log('TEXT: ', e.nativeEvent);
    // if (lines.length > (numberOfLines as number)) {
    //   if (currentIndex < fontSizePresets!.length - 1) {
    //     const updatedIndex = currentIndex + 1;
    //     setCurrentIndex(updatedIndex);
    //     setCurrentFont(fontSizePresets![updatedIndex]);
    //   }
    // }
  };

  return <BaseText {...props} onTextLayout={handleResizing} />;
}
