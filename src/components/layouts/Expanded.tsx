import { ViewProps } from 'react-native';
import styled from 'styled-components/native';

interface Props extends ViewProps {
  flex?: number;
  flexDirection?: string;
  backgroundColor?: string;
  justifyContent?: string;
  alignItems?: string;
  borderRadius?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
}

const Expanded = styled.View.attrs<Props>(props => ({
  flex: props.flex,
  flexDirection: props.flexDirection,
  justifyContent: props.justifyContent,
  alignItems: props.alignItems,
  paddingTop: props.paddingTop,
  paddingBottom: props.paddingBottom,
  paddingLeft: props.paddingLeft,
  paddingRight: props.paddingRight,
  backgroundColor: props.backgroundColor,
  borderRadius: props.borderRadius,
}))`
  flex: ${props => props.flex ?? 1};
  flex-direction: ${props => props.flexDirection ?? 'column'};
  justify-content: ${props => props.justifyContent ?? 'flex-start'};
  align-items: ${props => props.alignItems ?? 'center'};
  padding-top: ${props => props.paddingTop ?? 0}px;
  padding-bottom: ${props => props.paddingBottom ?? 0}px;
  padding-left: ${props => props.paddingLeft ?? 0}px;
  padding-right: ${props => props.paddingRight ?? 0}px;
  background-color: ${props => props.backgroundColor ?? 'transparent'};
  border-radius: ${props => props.borderRadius ?? 0}px;
  align-self: stretch;
`;

export default Expanded;
