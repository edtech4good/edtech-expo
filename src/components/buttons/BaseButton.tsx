import { TouchableOpacityProps } from 'react-native';
import styled from 'styled-components/native';

export interface BaseButtonProps extends TouchableOpacityProps {
  isLoading?: boolean;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  flexDirection?: string;
  paddingHorizontal?: number;
  paddingVertical?: number;
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: string;
}

const BaseButton = styled.Pressable.attrs<BaseButtonProps>(
  (props: BaseButtonProps) => ({
    activeOpacity: 0.9,
    backgroundColor: props.backgroundColor,
    borderRadius: props.borderRadius,
    borderWidth: props.borderWidth,
    borderColor: props.borderColor,
    flexDirection: props.flexDirection,
    paddingHorizontal: props.paddingHorizontal,
    paddingVertical: props.paddingVertical,
    justifyContent: props.justifyContent,
    alignItems: props.alignItems,
    alignSelf: props.alignSelf,
  }),
)`
  background-color: ${props => props.backgroundColor ?? 'transparent'};
  border-radius: ${props =>
    props.borderRadius ?? props.theme.layouts.defaultRadius}px;
  border-width: ${props => props.borderWidth ?? 0}px;
  border-color: ${props => props.borderColor ?? 'transparent'};
  flex-direction: ${props => props.flexDirection ?? 'row'};
  padding-horizontal: ${props => props.paddingHorizontal ?? 0}px;
  padding-vertical: ${props => props.paddingVertical ?? 0}px;
  justify-content: ${props => props.justifyContent ?? 'center'};
  align-items: ${props => props.alignItems ?? 'center'};
`;

export default BaseButton;
