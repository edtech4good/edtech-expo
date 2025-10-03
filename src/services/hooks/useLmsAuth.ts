import { useDispatch } from 'react-redux';
import { useApi } from '../api/ApiContext';
import { LmsLoginPayload, LoginPayload, Profile } from '@/models';
import { useAppSelector } from '@/redux';
import { AuthenticationActions, getProfile } from '@/redux/slices';
import { useState } from 'react';
import { Decoder } from '@/utils';
import _ from 'lodash';
import { router } from 'expo-router';
import { toAuthPayload } from '@/transforms';

export default function useLmsAuth() {
  const dispatch = useDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const [isLogginIn, setIsLogginIn] = useState(false);
  const [error, setError] = useState('');

  const login = async (payload: LoginPayload) => {
    try {
      setIsLogginIn(true);
      setError('');
      const authPayload = toAuthPayload(payload, false) as LmsLoginPayload;
      const response = await api.login(authPayload);
      await api.setHeaders({
        authorization: `Bearer ${_.get(response.data, 'data.accessToken')}`,
      });

      console.log('HUH?');
      const profileString = Decoder(
        _.get(response.data, 'data.accessToken') || '',
      );
      const profile = JSON.parse(profileString) as Profile;

      await dispatch(
        AuthenticationActions.updateAccessToken({
          accessToken: _.get(response.data, 'data.accessToken'),
          profile,
        }),
      );
      router.replace('/teacher/dashboard');
    } catch (e) {
    } finally {
    }
  };

  return { login, isLogginIn, profile, error, setError };
}
