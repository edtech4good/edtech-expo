import _ from 'lodash';
import React, { memo } from 'react';
import styled, { useTheme } from 'styled-components/native';

interface DividerProps {
  backgroundColor?: string;
  color?: string;
  endIndent?: number;
  height?: number;
  indent?: number;
  thickness?: number;
}

const Line = styled.View.attrs<DividerProps>(({ color, thickness }) => ({
  color,
  thickness,
}))`
  height: ${props => props.thickness ?? props.theme.layouts.divider}px;
  background-color: ${props => props.color ?? props.theme.colors.divider};
`;

const Wrapper = styled.View.attrs<DividerProps>(
  ({ height, indent, endIndent, backgroundColor }: DividerProps) => ({
    backgroundColor,
    height,
    indent,
    endIndent,
  }),
)`
  align-self: stretch;
  width: 100%;
  background-color: ${props => props.backgroundColor ?? 'transparent'};
  height: ${props => props.height ?? props.theme.layouts.divider}px;
  justify-content: center;

  padding-left: ${props => props.indent ?? 0}px;
  padding-right: ${props => props.endIndent ?? 0}px;
  overflow: hidden;
`;

function Divider({
  height,
  thickness,
  indent,
  endIndent,
  color,
  backgroundColor,
}: DividerProps) {
  const theme = useTheme();
  const dividerHeight = React.useMemo(
    () =>
      (_.isNumber(height) ? height : 0) * 2 +
      (_.isNumber(thickness) ? thickness : theme.layouts.divider),
    [height],
  );

  return (
    <Wrapper
      backgroundColor={backgroundColor}
      height={dividerHeight}
      indent={indent}
      endIndent={endIndent}>
      <Line color={color} thickness={thickness} />
    </Wrapper>
  );
}

export default memo(Divider);
