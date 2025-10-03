import { useAppDispatch, useAppSelector } from '@/redux';
import { useApi } from '../api/ApiContext';
import {
  getAccessToken,
  getProfile,
  getSelectedStandard,
  getStandards,
  StandardActions,
} from '@/redux/slices';
import { useState } from 'react';
import _ from 'lodash';
import { TeacherProfile } from '@/models';

import * as FileSystem from 'expo-file-system';

export default function useTeacherProfile() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);

  const accessToken = useAppSelector(getAccessToken);
  const standards = useAppSelector(getStandards);
  const selectedStandard = useAppSelector(getSelectedStandard);
  const [isFetching, setIsFetching] = useState(false);
  const [standardProfile, setStandardProfile] = useState<
    TeacherProfile | undefined
  >(undefined);

  const fetchAllStandard = async () => {
    // const downloadResumable = FileSystem.createDownloadResumable(
    //   `${process.env.EXPO_PUBLIC_BASE_URL}/export/log`,
    //   FileSystem.documentDirectory + 'small.zip',
    //   {
    //     headers: {
    //       authorization: `Bearer ${accessToken}`,
    //     },
    //   },
    //   () => {
    //     ' I am done ';
    //   },
    // );

    // const { uri } = await downloadResumable.downloadAsync();
    // console.log('Finished downloading to ', uri);

    // // const response = api.downloadDataFromRpi();
    // return;
    if (!profile) return;
    try {
      const response = await api.fetchStandard(profile.schoolname);
      dispatch(
        StandardActions.updateStandards(_.get(response, 'data.data', [])),
      );
    } catch (e) {
      console.log('Fetch Standard Error: ', e);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchProfile = async (standardId: string) => {
    if (!standardId) return;
    try {
      setIsFetching(true);
      const response = await api.fetchTeacherProfile(standardId);
      setStandardProfile(response.data?.data);
      console.log('HELLO?');
    } catch (e) {
      console.log('Fetch Profile Error: ', e);
    } finally {
      setIsFetching(false);
    }
  };

  return {
    fetchAllStandard,
    fetchProfile,
    standards,
    selectedStandard,
    isFetching,
    standardProfile,
  };
}
