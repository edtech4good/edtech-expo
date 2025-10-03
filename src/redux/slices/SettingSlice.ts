import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import i18next from 'i18next';

interface Props {
  language: 'en' | 'km';
  grantedStorageDirectory: string;
  resourcePath: string;
}

const name = 'setting';

const initialState: Props = {
  language: 'km',
  grantedStorageDirectory: '',
  resourcePath: '',
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
    clearAction: () => initialState,
  },
});

export const SettingActions = settingSlice.actions;

export const getSelectedLanguage = (state: RootState) => state.setting.language;
export const getGrantedStorageDirectory = (state: RootState) =>
  state.setting.grantedStorageDirectory;
export const getResourcePath = (state: RootState) => state.setting.resourcePath;
