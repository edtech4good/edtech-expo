import DragLabScreen from '@/screens/Dev/DragLabScreen';
import { Redirect } from 'expo-router';

// __DEV__-only harness for the drag primitive (src/components/drag). Not
// linked from anywhere: open /drag-lab on web, or
// exp://127.0.0.1:<metro port>/--/drag-lab in Expo Go. It needs no login.
export default function DragLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DragLabScreen />;
}
