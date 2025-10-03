import { useAppSelector } from '@/redux';
import {
  getSelectedCourse,
  getSelectedLesson,
  getSelectedLevel,
  getSelectedModule,
  getSelectedSubject,
  getSelectedUnit,
} from '@/redux/slices';

export default function useSelection() {
  const subject = useAppSelector(getSelectedSubject);
  const course = useAppSelector(getSelectedCourse);
  const unit = useAppSelector(getSelectedUnit);
  const level = useAppSelector(getSelectedLevel);
  const lesson = useAppSelector(getSelectedLesson);
  const module = useAppSelector(getSelectedModule);

  return { subject, course, unit, level, lesson, module };
}
