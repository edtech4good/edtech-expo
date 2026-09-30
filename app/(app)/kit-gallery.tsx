import KitGalleryScreen from '@/screens/Dev/KitGalleryScreen';
import { Redirect } from 'expo-router';

// __DEV__-only gallery of the corporate question kit (src/components/kit).
// Not linked from anywhere: open /kit-gallery on web, or
// exp://127.0.0.1:<metro port>/--/kit-gallery in Expo Go. It needs no login.
export default function KitGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <KitGalleryScreen />;
}
