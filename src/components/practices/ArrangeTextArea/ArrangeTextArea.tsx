import DropAreaWrapper from '@/components/DropAreaWrapper';
import Row from '@/components/layouts/Row';
import { DropAreaProps } from '@/models';
import { useParentLayout, useScreenDimension } from '@/services';
import _ from 'lodash';
import { ReactNode, useMemo } from 'react';
import { useTheme } from 'styled-components/native';

interface Props {
  id: string;
  onLayout?: (val: DropAreaProps) => void;
  children?: ReactNode;
}

export default function ArrangeTextArea({ id, onLayout, children }: Props) {
  const theme = useTheme();
  const { windowWidth } = useScreenDimension();

  return (
    <DropAreaWrapper id={id} onLayout={onLayout}>
      <Row
        justifyContent="center"
        alignItems="center"
        style={{
          flex: 1,
          width: theme.breakpoints.MOBILE_MAX_WIDTH,
          maxWidth: windowWidth / 2,
          maxHeight: 200,
          borderRadius: theme.layouts.defaultRadius,
          alignSelf: 'stretch',
          borderWidth: theme.layouts.divider,
          borderStyle: 'dotted',
          borderColor: theme.colors.secondary,
          flexWrap: 'wrap',
          alignContent: 'center',
        }}>
        {children && children}
      </Row>
    </DropAreaWrapper>
  );
}
