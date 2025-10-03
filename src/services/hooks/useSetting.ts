import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getGrantedStorageDirectory,
  getResourcePath,
  SettingActions,
} from '@/redux/slices';
import * as FileSystem from 'expo-file-system';
import _ from 'lodash';
import { Platform } from 'react-native';

export default function useSetting() {
  const dispatch = useAppDispatch();

  const storageDirectory = useAppSelector(getGrantedStorageDirectory);
  const resourcePath = useAppSelector(getResourcePath);

  const requestStoragePermission = async () => {
    if (Platform.OS === 'web') return;
    const grantedDirectory =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

    console.log('====> ', grantedDirectory);
    if (_.isEmpty(grantedDirectory) || grantedDirectory.granted === false)
      return;

    await dispatch(
      SettingActions.updateStorageDirectory(grantedDirectory.directoryUri),
    );

    return grantedDirectory.directoryUri;
  };

  const updateResourcePath = async () => {
    if (Platform.OS === 'web') return;
    const allFiles = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      storageDirectory,
    );
    if (_.isEmpty(allFiles)) return;
    const tempPath = allFiles[0];
    const splitIndex = tempPath.lastIndexOf('%2F');
    const splitUri = tempPath.substring(0, splitIndex);

    await dispatch(SettingActions.updateResourcePath(`${splitUri}%2F`));
  };

  const readFileInStorage = async () => {
    const allFiles = await FileSystem.StorageAccessFramework.readDirectoryAsync(
      storageDirectory,
    );
  };

  const retrieveFile = async (fileName: string) => {
    if (Platform.OS === 'web') return;
    try {
      const allFiles =
        await FileSystem.StorageAccessFramework.readDirectoryAsync(
          storageDirectory,
        );
      const tempPath = allFiles[0];
      const splitIndex = tempPath.lastIndexOf('%2F');
      const splitUri = tempPath.substring(0, splitIndex);
      console.log('DIR PATH : ', `${splitUri}%2F${fileName}`);
      return `${splitUri}%2F${fileName}`;
    } catch (e) {
      // return FileSystem.documentDirectory +  ""
      return '';
    }
  };

  return {
    requestStoragePermission,
    readFileInStorage,
    retrieveFile,
    updateResourcePath,
  };
}
