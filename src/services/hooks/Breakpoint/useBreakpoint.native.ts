import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useState } from 'react';

interface Props {
  desktop?: any;
  tablet?: any;
  phablet?: any;
  mobile?: any;
}

export default function useBreakpoint({
  desktop,
  mobile,
  tablet,
  phablet,
}: Props) {
  const [orientation, setOrientation] = useState<number>(0);

  useEffect(() => {
    // load();
  }, []);

  // const load = async () => {
  //   const currentOrientation = await ScreenOrientation.getOrientationAsync();
  //   setOrientation(currentOrientation);
  // };

  // if (orientation === 1) return mobile;
  // if (orientation === 3 || orientation === 4) return phablet;
  if (!phablet) return mobile;
  return phablet;
}
