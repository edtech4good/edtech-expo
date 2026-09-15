import { LessonScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function LessonDetailPage() {
  return (
    <OfflineBannerFrame safeAreaTop>
      <LessonScreen />
    </OfflineBannerFrame>
  );
}
