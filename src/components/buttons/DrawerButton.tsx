import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import IconButton from './IconButton';
import { useTheme } from 'styled-components/native';

export default function DrawerButton() {
  const theme = useTheme();
  const navigation = useNavigation();
  const handleToggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  return (
    <IconButton
      onPress={handleToggleDrawer}
      iconSize={theme.fontSizes.h3}
      style={{ marginRight: theme.layouts.large }}
    />
  );
}
