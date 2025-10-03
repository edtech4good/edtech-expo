import { useAppDispatch } from '@/redux';
import { useApi } from '../api/ApiContext';

export default function useStudentList() {
  const api = useApi();
  const dispatch = useAppDispatch();

  const fetch = async () => {};

  return { fetch };
}
