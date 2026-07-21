import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import i18next from 'i18next';

interface Props {
  language: 'en' | 'km';
  grantedStorageDirectory: string;
  resourcePath: string;
  theme: 'kids' | 'corporate';
}

const name = 'setting';

const initialState: Props = {
  language: 'km',
  grantedStorageDirectory: '',
  resourcePath: '',
  theme:
    process.env.EXPO_PUBLIC_DEFAULT_THEME === 'corporate'
      ? 'corporate'
      : 'kids',
};

export const settingSlice = createSlice({
  name,
  initialState,
  reducers: {
    changeLanguageAction: (state, action) => {
      i18next.changeLanguage(action.payload);
      state.language = action.payload;
      return state;
    },
    updateStorageDirectory: (state, action) => {
      state.grantedStorageDirectory = action.payload;
      return state;
    },
    updateResourcePath: (state, action) => {
      state.resourcePath = action.payload;
      return state;
    },
    changeThemeAction: (state, action) => {
      state.theme = action.payload;
      return state;
    },
    clearAction: () => initialState,
  },
});

export const SettingActions = settingSlice.actions;

export const getSelectedLanguage = (state: RootState) => state.setting.language;
export const getGrantedStorageDirectory = (state: RootState) =>
  state.setting.grantedStorageDirectory;
export const getResourcePath = (state: RootState) => state.setting.resourcePath;
// redux-persist rehydrates old persisted state that predates the `theme`
// key, so fall back to 'kids' rather than trusting the type.
export const getSelectedTheme = (state: RootState) =>
  state.setting.theme ?? 'kids';
