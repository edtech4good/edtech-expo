import { useAppSelector } from '@/redux';
import { getAccessToken, getResourcePath } from '@/redux/slices';
import * as FileSystem from 'expo-file-system';
import { useApi } from '../api/ApiContext';
import useSetting from './useSetting';
import useResource from './useResource';
import { useSelector } from 'react-redux';
import * as DocumentPicker from 'expo-document-picker';
import { useMemo } from 'react';
import { Alert } from 'react-native';

const STUDENT_LOG_FILE_LOCATION =
  FileSystem.documentDirectory + 'studentlog.zip';

const CONTENT_DATA_FILE_LOCATION =
  FileSystem.documentDirectory + 'syncData.zip';

export default function useSyncContent() {
  const api = useApi();
  const accessToken = useAppSelector(getAccessToken);
  const { requestStoragePermission } = useSetting();

  const localResourcePath = useSelector(getResourcePath);
  const source = useResource({ name: 'studentlog.zip' }, [localResourcePath]);

  const downloadLocation = useMemo(() => `${source}`, [localResourcePath]);

  const downloadContentFromRpi = async () => {
    console.log('DOWNLOAD PATH: ', downloadLocation);
    const downloadResumable = FileSystem.createDownloadResumable(
      `${process.env.EXPO_PUBLIC_BASE_URL}/export/log`,
      STUDENT_LOG_FILE_LOCATION,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
      () => {
        ' I am done ';
      },
    );

    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult) return;
    Alert.alert('Download Complete', 'Your data has been downloaded');
    console.log('Downloaded toooooo ', downloadResult.uri);
  };

  const uploadContentToCloud = async () => {
    const response = await DocumentPicker.getDocumentAsync();
    console.log('RESPONSE: ', response);
    if (response.canceled) return;
    // return;

    // const uri = await FileSystem.getContentUriAsync(STUDENT_LOG_FILE_LOCATION);
    // const response = await requestStoragePermission();
    // await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    // await api.Ping();
    // return;
    const formData = new FormData();
    formData.append('importfile', {
      uri: response.assets[0].uri,
      type: response.assets[0].mimeType,
      name: `studentlog`,
    });

    // console.log(STUDENT_LOG_FILE_LOCATION);
    console.log('umm', source);

    // const hello = await retrieveFile('studentlog.zip');

    // console.log('hello', hello);

    await api.uploadToCloud(formData);

    // const uri = await FileSystem.getContentUriAsync(STUDENT_LOG_FILE_LOCATION);
    // const uploadResumable = FileSystem.createUploadTask(
    //   `${process.env.EXPO_PUBLIC_SYNC_URL}/log/import`,
    //   response.assets[0].uri,
    //   {
    //     httpMethod: 'PUT',
    //     fieldName: 'importfile',
    //     headers: {
    //       authorization: `Bearer ${accessToken}`,
    //     },
    //   },
    //   () => {
    //     ' Upload am done ';
    //   },
    // );

    // const gg = await uploadResumable.uploadAsync();
    // console.log('I AM DONE?', gg);
  };

  const downloadContentFromCloud = async () => {
    const downloadResumable = FileSystem.createDownloadResumable(
      `${process.env.EXPO_PUBLIC_SYNC_URL}/sync/content`,
      CONTENT_DATA_FILE_LOCATION,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
      () => {
        ' I am done ';
      },
    );

    const downloadResult = await downloadResumable.downloadAsync();
    if (!downloadResult) return;
    console.log('Downloaded to ', downloadResult.uri);
  };

  const uploadContentToRpi = async () => {
    const response = await DocumentPicker.getDocumentAsync();
    const formData = new FormData();
    formData.append('importfile', {
      uri: response.assets[0].uri,
      name: `syncdata`,
    });

    console.log(accessToken);
    const uploadResumable = FileSystem.createUploadTask(
      `${process.env.EXPO_PUBLIC_BASE_URL}/import/master`,
      response.assets[0].uri,
      {
        fieldName: 'importfile',
        httpMethod: 'PUT',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
      () => {
        ' Upload am done ';
      },
    );

    const gg = await uploadResumable.uploadAsync();
    console.log(' AM I DONE? ', gg);
  };

  return {
    downloadContentFromCloud,
    downloadContentFromRpi,
    uploadContentToCloud,
    uploadContentToRpi,
  };
}
