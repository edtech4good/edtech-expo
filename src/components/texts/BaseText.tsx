import { TextProps } from 'react-native';
import styled from 'styled-components/native';

import { changeColorOpacity, isDisabled } from '@/utils';
import { FontFamily, fontWeights } from '@/constants';
import { ReactElement } from 'react';

export interface BaseTextProps extends TextProps {
  alignSelf?: 'flex-start' | 'center' | 'flex-end';
  color?: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  fontWeight?: keyof typeof fontWeights;
  lineHeight?: number;
  textAlign?: string;
  textVerticalAlign?: string;
  onPress?: () => void;
}

const BaseText = styled.Text.attrs<BaseTextProps>(props => ({
  alignSelf: props.alignSelf,
  children: props.children,
  color: props.color,
  disabled: props.disabled,
  fontFamily: props.fontFamily,
  fontSize: props.fontSize,
  fontWeight: props.fontWeight,
  lineHeight: props.lineHeight,
  textAlign: props.textAlign,
  textVerticalAlign: props.textVerticalAlign,
  onPress: props.onPress,
}))`
  color: ${props =>
    changeColorOpacity(
      props.color ?? props.theme.colors.onBackground,
      isDisabled(props.disabled),
    )};
  font-family: ${props => props.fontFamily ?? 'NotoSansKhmerRegular'};
  font-size: ${props => props.fontSize ?? props.theme.fontSizes.h4}px;
  align-self: ${props => props.alignSelf ?? 'center'};
  font-weight: ${props => props.fontWeight ?? 'normal'};
  text-align: ${props => props.textAlign ?? 'center'};
  text-align-vertical: ${props => props.textVerticalAlign ?? 'center'};
  line-height: ${props => props.lineHeight}px;
`;

export default BaseText;
