import React, { Component } from 'react';
import { ViewProps } from 'react-native';
import styled from 'styled-components/native';

import { Metrics } from '@/themes';

interface Props extends ViewProps {
  backgroundColor?: string;
  height?: number | string;
  width?: number | string;
  borderRadius?: number;
}

interface ExtendedProps extends ViewProps {
  backgroundColor?: string;
  height?: boolean;
  width?: boolean;
  borderRadius?: number;
}

const SizedBoxComponent = React.memo(styled.View.attrs<Props>(props => ({
  height: props.height ? props.height : 1,
  width: props.width ? props.width : 1,
  backgroundColor: props.backgroundColor || 'transparent',
  borderRadius: props.borderRadius || 0,
  style: props.style,
}))`
  background-color: ${props => props.backgroundColor};
  height: ${props => props.height}px;
  width: ${props => props.width}px;
  border-radius: ${props => props.borderRadius}px;
  justify-content: center;
  align-items: center;
`);

export default class SizedBox extends Component<Props> {
  static Tiny = ({
    backgroundColor = 'transparent',
    height,
    width,
    borderRadius = 0,
    children,
    style,
  }: ExtendedProps) => (
    <SizedBoxComponent
      height={height ? Metrics.layouts.tiny : 1}
      width={width ? Metrics.layouts.tiny : 1}
      borderRadius={borderRadius}
      backgroundColor={backgroundColor}
      style={style}>
      {children}
    </SizedBoxComponent>
  );

  static Small = ({
    backgroundColor = 'transparent',
    height,
    width,
    borderRadius = 0,
    children,
    style,
  }: ExtendedProps) => (
    <SizedBoxComponent
      height={height ? Metrics.layouts.small : 1}
      width={width ? Metrics.layouts.small : 1}
      borderRadius={borderRadius}
      backgroundColor={backgroundColor}
      style={style}>
      {children}
    </SizedBoxComponent>
  );

  static Medium = ({
    backgroundColor = 'transparent',
    height,
    width,
    borderRadius = 0,
    children,
    style,
  }: ExtendedProps) => (
    <SizedBoxComponent
      height={height ? Metrics.layouts.medium : 1}
      width={width ? Metrics.layouts.medium : 1}
      borderRadius={borderRadius}
      backgroundColor={backgroundColor}
      style={style}>
      {children}
    </SizedBoxComponent>
  );

  static Large = ({
    backgroundColor = 'transparent',
    height,
    width,
    borderRadius = 0,
    children,
    style,
  }: ExtendedProps) => (
    <SizedBoxComponent
      height={height ? Metrics.layouts.large : 1}
      width={width ? Metrics.layouts.large : 1}
      borderRadius={borderRadius}
      backgroundColor={backgroundColor}
      style={style}>
      {children}
    </SizedBoxComponent>
  );

  render() {
    return (
      <SizedBoxComponent
        height={this.props.height}
        width={this.props.width}
        borderRadius={this.props.borderRadius}
        backgroundColor={this.props.backgroundColor}
        style={this.props.style}>
        {this.props.children}
      </SizedBoxComponent>
    );
  }
}
