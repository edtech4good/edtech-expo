import { LessonSelectionScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function LessonsPage() {
  return (
    <OfflineBannerFrame>
      <LessonSelectionScreen />
    </OfflineBannerFrame>
  );
}
