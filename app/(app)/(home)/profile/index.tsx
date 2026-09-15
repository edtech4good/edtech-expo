import { StudentProfileScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function ProfilePage() {
  return (
    <OfflineBannerFrame>
      <StudentProfileScreen />
    </OfflineBannerFrame>
  );
}
