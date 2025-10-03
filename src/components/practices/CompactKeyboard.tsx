import { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import Column from '../layouts/Column';
import { Pressable } from 'react-native';
import H5 from '../texts/H5';
import { useTheme } from 'styled-components/native';
import Row from '../layouts/Row';
import _ from 'lodash';

const KEY_WIDTH = 52;

const ENGLISH_NUMERAL = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: '7', value: '7' },
  { label: '8', value: '8' },
  { label: '9', value: '9' },
  { label: '0', value: '0' },
];

const KHMER_NUMERAL = [
  { label: '១', value: '1' },
  { label: '២', value: '2' },
  { label: '៣', value: '3' },
  { label: '៤', value: '4' },
  { label: '៥', value: '5' },
  { label: '៦', value: '6' },
  { label: '៧', value: '7' },
  { label: '៨', value: '8' },
  { label: '៩', value: '9' },
  { label: '០', value: '0' },
];

interface CompactKeyProps {
  label: string;
  value: string;
  onPress?: (label: string, val: string) => void;
  size?: 'one' | 'two';
}

const CompactKey = ({
  label,
  value,
  onPress,
  size = 'one',
}: CompactKeyProps) => {
  const theme = useTheme();
  const handlePress = () => {
    if (!onPress) return;
    onPress(label, value);
  };

  const keyWidth = useMemo(
    () => (size === 'one' ? KEY_WIDTH : KEY_WIDTH * 2 + theme.layouts.medium),
    [size],
  );

  return (
    <Pressable
      onPress={handlePress}
      // onLayout={handleOnLayout}
      style={{
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.layouts.medium,
        paddingVertical: theme.layouts.small,
        borderWidth: theme.layouts.divider,
        borderColor: theme.colors.outline,
        borderRadius: theme.layouts.defaultRadius,
        marginBottom: theme.layouts.medium,
        marginRight: theme.layouts.medium,
        width: keyWidth,
      }}>
      <H5>{label}</H5>
    </Pressable>
  );
};

interface CompactKeyboardProps {
  onChange?: (label: string, val: string) => void;
  onDel?: () => void;
  keyPerRow?: number;
  keyPerColumn?: number;
}

interface CompactKeyboardHandler {
  clear: () => void;
}

export default forwardRef<CompactKeyboardHandler, CompactKeyboardProps>(
  function CompactKeyboard(
    {
      onChange = (label, val) => undefined,
      onDel = () => undefined,
      keyPerRow = 5,
    },
    ref,
  ) {
    const theme = useTheme();
    const KEY_GAP = theme.layouts.medium;

    const keyboardWidth = useMemo(
      () => KEY_WIDTH * keyPerRow + KEY_GAP * keyPerRow,
      [keyPerRow],
    );

    const [lang, setLang] = useState<'en' | 'km'>('en');

    const keyToRender = useMemo(
      () => (lang === 'en' ? ENGLISH_NUMERAL : KHMER_NUMERAL),
      [lang],
    );

    const langText = useMemo<string>(
      () => (lang === 'en' ? 'លេខខ្មែរ' : 'អង់គ្លេស'),
      [lang],
    );

    useImperativeHandle(ref, () => {
      return {
        clear() {},
      };
    });

    const handleKeyPress = (key: string, val: string) => {
      onChange(key, val);
    };

    const handleChangeLang = () => {
      if (lang === 'en') setLang('km');
      else setLang('en');
    };

    const renderKeys = () =>
      _.map(keyToRender, (value, index) => (
        <CompactKey
          key={`${value}-${index}`}
          onPress={handleKeyPress}
          label={value.label}
          value={value.value}
        />
      ));

    return (
      <Column style={{ width: keyboardWidth, alignItems: 'flex-start' }}>
        <Row style={{ flexWrap: 'wrap', width: keyboardWidth }}>
          {renderKeys()}
          {/* <CompactKey onPress={handleKeyPress} label="1" value="1" />
          <CompactKey onPress={handleKeyPress} label="2" value="2" />
          <CompactKey onPress={handleKeyPress} label="3" value="3" />
          <CompactKey onPress={handleKeyPress} label="4" value="4" />
          <CompactKey onPress={handleKeyPress} label="5" value="5" />
          <CompactKey onPress={handleKeyPress} label="6" value="6" />
          <CompactKey onPress={handleKeyPress} label="7" value="7" />
          <CompactKey onPress={handleKeyPress} label="8" value="8" />
          <CompactKey onPress={handleKeyPress} label="9" value="9" />
          <CompactKey onPress={handleKeyPress} label="0" value="0" /> */}
        </Row>
        <Row>
          <CompactKey
            onPress={handleChangeLang}
            label={langText}
            value="lang"
            size="two"
          />
          <CompactKey onPress={onDel} label="លុបចោល" value="del" size="two" />
        </Row>
      </Column>
    );
  },
);
