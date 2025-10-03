import { getResourcePath } from '@/redux/slices';
import _ from 'lodash';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useSelector } from 'react-redux';

interface Props {
  name: string;
}

export default function useResource(props: Props, deps: Array<any>) {
  const localResourcePath = useSelector(getResourcePath);
  const remoteResourcePath = process.env.EXPO_PUBLIC_RESOURCE_URL;
  const folderPath = process.env.EXPO_PUBLIC_RESOURCE_PATH;
  const { name } = props;

  // console.log('Resource: ', `${remoteResourcePath}/${folderPath}/${name}`);

  return useMemo(() => {
    if (_.isEmpty(name)) return '';
    if (
      Platform.OS === 'web' ||
      process.env.EXPO_PUBLIC_ACCESS_TYPE === 'online'
    )
      return `${remoteResourcePath}/${folderPath}/${name}`;
    return `${localResourcePath}${name}`;
  }, deps);
}
