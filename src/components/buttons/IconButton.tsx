import { MaterialCommunityIcons } from '@expo/vector-icons';
import styled, { useTheme } from 'styled-components/native';

import BaseButton from './BaseButton';
import SH3 from '../texts/SH3';

interface ButtonProps {
  buttonColor?: string;
  borderColor?: string;
  borderRadius?: number;
  buttonSize?: number;
  disabled?: boolean;
  style?: object;
}

const Button = styled(BaseButton).attrs<ButtonProps>((props: ButtonProps) => ({
  buttonColor: props.buttonColor,
  borderColor: props.borderColor,
  borderRadius: props.borderRadius,
  buttonSize: props.buttonSize,
  disabled: props.disabled ?? false,
  activeOpacity: 0.8,
}))`
  background-color: ${props => props.buttonColor};
  justify-content: center;
  align-items: center;
`;

const BadgeWrapper = styled.View`
  position: absolute;
  bottom: 0;
  right: 0;
  padding-horizontal: ${props => props.theme.layouts.tiny}px;
  background: ${props => props.theme.colors.error};
  border-radius: ${props => props.theme.fontSizes.sh3}px;
`;

interface Props extends ButtonProps {
  buttonColor?: string;
  borderColor?: string;
  borderRadius?: number;
  buttonSize?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  disabled?: boolean;

  icon?: string;
  iconColor?: string;
  iconSize?: number;

  badgeCount?: number;

  onPress?: () => void;
}

export default function IconButton({
  borderColor = 'transparent',
  borderRadius = 0,
  buttonColor = 'transparent',
  buttonSize,
  paddingHorizontal = 0,
  paddingVertical = 0,
  disabled = false,
  icon = 'menu',
  iconColor = 'black',
  iconSize,
  badgeCount = 0,
  style = {},
  onPress = () => undefined,
}: Props) {
  const theme = useTheme();
  return (
    <Button
      buttonColor={buttonColor}
      borderColor={borderColor}
      borderRadius={borderRadius}
      buttonSize={buttonSize}
      paddingHorizontal={paddingHorizontal}
      paddingVertical={paddingVertical}
      style={style}
      onPress={onPress}
      disabled={disabled}>
      {/* <Icon IconAsset={icon} color={iconColor} size={iconSize} /> */}
      <MaterialCommunityIcons
        name={icon}
        size={iconSize ?? 24}
        color={iconColor}
      />
      {badgeCount > 0 && (
        <BadgeWrapper>
          <SH3 fontWeight="bold" color={theme.colors.onPrimary}>
            {`${badgeCount}`}
          </SH3>
        </BadgeWrapper>
      )}
    </Button>
  );
}
