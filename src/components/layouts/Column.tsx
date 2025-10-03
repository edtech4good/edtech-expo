import styled from 'styled-components/native';

interface Props {
  flex?: number;
  backgroundColor?: string;
  flexDirection?: 'column' | 'reverse-column';
  justifyContent?: string;
  alignItems?: string;
  alignSelf?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  borderRadius?: number;
}

const Column = styled.View.attrs<Props>((props: Props) => ({
  backgroundColor: props.backgroundColor,
  flexDirection: props.flexDirection || 'column',
  justifyContent: props.justifyContent || 'flex-start',
  alignItems: props.alignItems || 'center',
  alignSelf: props.alignSelf,
  paddingTop: props.paddingTop,
  paddingBottom: props.paddingBottom,
  paddingLeft: props.paddingLeft,
  paddingRight: props.paddingRight,
  borderRadius: props.borderRadius,
}))`
  background-color: ${props => props.backgroundColor ?? 'transparent'};
  flex-direction: ${props => props.flexDirection};
  justify-content: ${props => props.justifyContent};
  align-items: ${props => props.alignItems};
  align-self: ${props => props.alignSelf ?? 'stretch'};
  padding-top: ${props => props.paddingTop ?? 0}px;
  padding-bottom: ${props => props.paddingBottom ?? 0}px;
  padding-left: ${props => props.paddingLeft ?? 0}px;
  padding-right: ${props => props.paddingRight ?? 0}px;
  border-radius: ${props => props.borderRadius ?? 0}px;
`;

export default Column;
