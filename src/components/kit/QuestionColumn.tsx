import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from 'styled-components/native';

/** The centred column width on tablet and desktop (design decision 13). */
export const QUESTION_COLUMN_WIDTH = 760;

export interface QuestionColumnProps {
  children: ReactNode;
  /**
   * Add the page gutter (20 on phones) inside the column. Turn off when the
   * parent already pads its content, so the gutter is not doubled.
   */
  gutter?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Full width on phones; a 760 column, centred, on tablet and desktop. The
 * column is a cap, not a breakpoint: below 760 (plus gutters) the content
 * simply fills the width, so no measurement or media query is needed and a
 * rotating tablet reflows for free. The 760 is the content width: the
 * gutters sit outside it.
 *
 * Corporate only. Kids-theme screens keep today's full-width layout, so
 * nothing renders this for them. It is not applied to any screen yet
 * (steps 2 to 6 use it), because the practice screens still own their own
 * padding and scrolling.
 */
export default function QuestionColumn({
  children,
  gutter = true,
  style,
  testID,
}: QuestionColumnProps) {
  const theme = useTheme();
  const pad = gutter ? theme.layouts.pageHorizontalPadding : 0;
  return (
    <View
      testID={testID}
      style={[
        {
          width: '100%',
          maxWidth: QUESTION_COLUMN_WIDTH + pad * 2,
          alignSelf: 'center',
          paddingHorizontal: pad,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
