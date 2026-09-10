import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { Profile } from '@/models';
import { clearAllData } from '../CommonAction';

interface Props {
  accessToken?: string;
  profile?: Profile;
}

const name = 'authentication';

const initialState: Props = {
  accessToken: '',
  profile: undefined,
};

export const authenticationSlice = createSlice({
  name,
  initialState,
  reducers: {
    updateAccessToken: (state, action: { type: string; payload: Props }) => {
      state.accessToken = action.payload.accessToken;
      state.profile = action.payload.profile;
      return state;
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

export const getAccessToken = (state: RootState) =>
  state.authentication.accessToken;

export const getProfile = (state: RootState) => state.authentication.profile;

export const AuthenticationActions = authenticationSlice.actions;
