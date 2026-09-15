import { CourseSelectionScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function CoursesPage() {
  return (
    <OfflineBannerFrame>
      <CourseSelectionScreen />
    </OfflineBannerFrame>
  );
}
