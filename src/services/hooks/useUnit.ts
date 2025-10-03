import { useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppDispatch, useAppSelector } from '@/redux';
import { getUnits, SelectionActions, UnitActions } from '@/redux/slices';
import { Unit } from '@/models';

export default function useUnit(gradeId: string) {
  const api = useApi();
  const dispatch = useAppDispatch();
  const units = useAppSelector(getUnits);
  const [isFetching, setIsFetching] = useState(false);

  const fetch = async () => {
    await setIsFetching(true);
    const response = await api.fetchUnits(gradeId);
    dispatch(UnitActions.updateUnit(response.data?.data));
    await setIsFetching(false);
  };

  const selectUnit = async (u: Unit) => {
    await dispatch(SelectionActions.selectUnit(u));
  };

  const clear = async () => {
    await dispatch(UnitActions.clear());
  };

  return { fetch, selectUnit, isFetching, units, clear };
}
