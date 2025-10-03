import _ from 'lodash';
import { ViewProps } from 'react-native';
import { useTheme } from 'styled-components/native';

import Column from '../layouts/Column';
import Expanded from '../layouts/Expanded';
import Row from '../layouts/Row';
import SizedBox from '../layouts/SizedBox';
import H4 from '../texts/H4';
import SH3 from '../texts/SH3';
// import BodyText from '../text/BodyText';
// import CaptionText from '../text/CaptionText';

interface Props extends ViewProps {
  required?: boolean;
  label?: string;
  errorMessage?: string;
  noHeader?: boolean;
}

export default function FormWrapper({
  errorMessage,
  label,
  required = false,
  noHeader = false,
  children,
}: Props) {
  const theme = useTheme();

  return (
    <Column
      alignSelf="stretch"
      alignItems="flex-start"
      justifyContent="flex-start">
      {noHeader === true && (
        <Row>
          <Expanded>
            <H4
              alignSelf="flex-start"
              textAlign="left"
              fontWeight="semi"
              color={theme.colors.onSurfaceVariant}>
              {label}
            </H4>
          </Expanded>
          {/* {required && (
            <H4
              alignSelf="flex-start"
              textAlign="left"
              color={theme.colors.error}>
              {' *'}
            </H4>
          )} */}
          {!_.isEmpty(errorMessage) && (
            <SH3 alignSelf="flex-start" color={theme.colors.error}>
              {errorMessage}
            </SH3>
          )}
        </Row>
      )}
      {noHeader === true && <SizedBox.Tiny height />}
      {children}
    </Column>
  );
}
