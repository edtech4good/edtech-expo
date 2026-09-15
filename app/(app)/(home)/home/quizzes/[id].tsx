import { PracticeScreen, QuizScreen } from '@/screens';
import { OfflineBannerFrame } from '@/components';

export default function QuizPage() {
  return (
    <OfflineBannerFrame>
      <QuizScreen />
    </OfflineBannerFrame>
  );
}
