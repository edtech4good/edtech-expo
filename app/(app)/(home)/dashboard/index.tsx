import { StudentDashboardScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function DashboardPage() {
  return (
    <OfflineBannerFrame>
      <StudentDashboardScreen />
    </OfflineBannerFrame>
  );
}
