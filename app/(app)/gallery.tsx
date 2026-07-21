import ComponentGalleryScreen from '@/screens/Dev/ComponentGalleryScreen';
import { Redirect } from 'expo-router';

export default function Gallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <ComponentGalleryScreen />;
}
