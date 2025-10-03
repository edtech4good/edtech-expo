import { clearAllData, useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import { useState } from 'react';
import {
  EdtechLoginPayload,
  LmsLoginPayload,
  LoginPayload,
  Profile,
} from '@/models';
import { AuthenticationActions, getProfile } from '@/redux/slices';
import { router } from 'expo-router';
import { Decoder } from '@/utils';
import _ from 'lodash';
import { toAuthPayload } from '@/transforms';
import useSyncContent from './useSyncContent';

export default function useAuth() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const [isLogginIn, setIsLogginIn] = useState(false);
  const [error, setError] = useState('');

  const { uploadContentToCloud, uploadContentToRpi } = useSyncContent();

  const login = async (payload: LoginPayload) => {
    try {
      // router.replace('/teacher/dashboard');

      // Test LMS

      // await api.Ping();

      // const lmsPayload = toAuthPayload(payload, true) as LmsLoginPayload;
      // const lmsResponse = await api.lmsLogin(lmsPayload);
      // await api.setHeaders({
      //   authorization: `Bearer ${_.get(lmsResponse.data, 'data.accessToken')}`,
      // });

      // await uploadContentToCloud();
      // return;
      setIsLogginIn(true);
      setError('');
      const authPayload = toAuthPayload(payload, false) as EdtechLoginPayload;
      const response = await api.login(authPayload);
      await api.setHeaders({
        authorization: `Bearer ${_.get(response.data, 'data.accessToken')}`,
      });

      const profileString = Decoder(
        _.get(response.data, 'data.accessToken') || '',
      );
      const profile = JSON.parse(profileString) as Profile;

      console.log('===> Profile: ', profile);

      await dispatch(
        AuthenticationActions.updateAccessToken({
          accessToken: _.get(response.data, 'data.accessToken'),
          profile,
        }),
      );

      // await uploadContentToRpi();
      // return;
      // router.replace('/home');
      if (profile.schooluserrole === 4) router.replace('/home');
      else router.replace('/teacher/dashboard');
    } catch (e) {
      setError(`${e}`);
    } finally {
      setIsLogginIn(false);
    }
  };

  const logout = async () => {
    await dispatch(clearAllData());
    router.replace('/login');
  };

  return { login, logout, isLogginIn, profile, error, setError };
}
