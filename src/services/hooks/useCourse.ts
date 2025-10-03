import { useMemo, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import { CourseActions, getCourses, SelectionActions } from '@/redux/slices';
import { Course } from '@/models';
import _ from 'lodash';

export default function useCourse(curriculumId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const courses = useAppSelector(getCourses);
  const sortedCourses = useMemo(
    () => _.sortBy(courses, 'gradename'),
    [courses],
  );
  const [isFetching, setIsFetching] = useState(false);

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchCourses(curriculumId);
    await dispatch(CourseActions.updateCourse(response.data?.data || []));
    await setIsFetching(false);
  };

  const selectCourse = async (course: Course) => {
    await dispatch(SelectionActions.selectCourse(course));
  };

  const clear = async () => {
    await dispatch(CourseActions.clear());
  };

  return { fetch, selectCourse, clear, courses: sortedCourses, isFetching };
}
