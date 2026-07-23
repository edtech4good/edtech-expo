import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { useAppDispatch, useAppSelector } from '@/redux';
import { getSelectedTheme, SettingActions } from '@/redux/slices';
import { ThemeName } from '@/themes/Themes';
import { setDevPillTouched } from '@/services/devThemeOverride';

// Dev-only affordance for switching between the kids and corporate themes
// live, without touching persisted settings UI. Never rendered in a
// production build. Long-press opens the component gallery (/gallery).
export default function DevThemeToggle() {
  const dispatch = useAppDispatch();
  const name = useAppSelector(getSelectedTheme);

  if (!__DEV__) return null;

  const handlePress = () => {
    const next: ThemeName = name === 'kids' ? 'corporate' : 'kids';
    setDevPillTouched();
    dispatch(SettingActions.changeThemeAction(next));
  };

  const handleLongPress = () => {
    router.push('/gallery');
  };

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.6}
    >
      <Text style={styles.label}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
    minHeight: 32,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
