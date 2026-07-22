import { useEffect, useState } from 'react';
import { useApi } from '../api/ApiContext';
import { useAppSelector } from '@/redux';
import { getSelectedCourse, getSelectedUnit } from '@/redux/slices';
import { Unit } from '@/models';

// Resolves the Level Detail header (grade name, unit) when the persisted
// redux selection doesn't cover the requested levelId — e.g. a deep reload
// or shared link on a fresh profile / cleared storage, where `selection` is
// absent. Falls back to hitting level/all + level/grade/<gradeid> +
// grade/all directly so the header can render without a prior navigation
// having populated the selection slice.
export default function useLevelHeader(levelId: string, enabled: boolean) {
  const api = useApi();
  const selectedCourse = useAppSelector(getSelectedCourse);
  const selectedUnit = useAppSelector(getSelectedUnit);
  const selectionValid = !!selectedUnit && selectedUnit.levelid === levelId;

  const [resolvedUnit, setResolvedUnit] = useState<Unit | undefined>(undefined);
  const [resolvedGradeName, setResolvedGradeName] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    let active = true;

    if (!enabled || !levelId || selectionValid) return;

    setResolvedUnit(undefined);
    setResolvedGradeName(undefined);

    const resolve = async () => {
      try {
        const allUnitsResponse = await api.fetchAllUnits();
        if (!active) return;

        const row = allUnitsResponse.data?.data?.find(
          u => u.levelid === levelId,
        );
        if (!row) return;

        const [unitsResponse, allCoursesResponse] = await Promise.all([
          api.fetchUnits(row.gradeid),
          api.fetchAllCourses(),
        ]);

        if (!active) return;

        const matchedUnit = unitsResponse.data?.data?.find(
          u => u.levelid === levelId,
        );
        const unit: Unit = matchedUnit ?? { ...row, progress: 0 };

        const gradeName = allCoursesResponse.data?.data?.find(
          c => c.gradeid === row.gradeid,
        )?.gradename;

        if (!active) return;
        setResolvedUnit(unit);
        setResolvedGradeName(gradeName);
      } catch {
        // Leave states undefined — header degrades to hero + lessons
        // progress, same as today.
      }
    };

    resolve();

    return () => {
      active = false;
    };
  }, [levelId, selectionValid, enabled]);

  // Guard against a one-frame stale render: resolvedUnit/resolvedGradeName
  // are cleared at the start of every resolution run, but that clear lands
  // after the render triggered by a levelId change, so without this check
  // a just-changed levelId could briefly render the previous level's data.
  const resolved = resolvedUnit?.levelid === levelId ? resolvedUnit : undefined;

  return {
    unit: selectionValid ? selectedUnit : resolved,
    gradeName: selectionValid
      ? selectedCourse?.gradename
      : resolved
      ? resolvedGradeName
      : undefined,
  };
}
