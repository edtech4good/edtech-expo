import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import {
  getProfile,
  getSubjects,
  SelectionActions,
  SubjectActions,
} from '@/redux/slices';
import { Subject } from '@/models';

export default function useSubject() {
  const dispatch = useAppDispatch();
  const api = useApi();
  const profile = useAppSelector(getProfile);
  const subjects = useAppSelector(getSubjects);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = async () => {
    setIsFetching(true);
    const response = await api.fetchSubjects();
    await dispatch(SubjectActions.updateSubject(response.data?.data));
    setIsFetching(false);
  };

  const fetchProgress = async (curId: string) => {
    const baselinePass = await api.fetchBaselineCurriculum({
      curriculumid: curId,
      schoolname: profile?.schoolname ?? '',
      studentid: profile?.schooluserid ?? '',
      baselineDateTime: new Date().getTime().toString(),
    });

    // const progress = await api.trashStudentProgress();
  };

  const selectSubject = async (cur: Subject) => {
    await dispatch(SelectionActions.selectSubject(cur));
  };

  return { fetch, fetchProgress, isFetching, subjects, selectSubject };
}
