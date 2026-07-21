import { useAppSelector } from '@/redux';
import { getSelectedTheme } from '@/redux/slices';

/**
 * Screen-level structural branching between the kids and corporate designs
 * (docs/corporate-design-per-school.md — "Screen-level structural differences
 * key off the same selector"). Token-only differences should keep using
 * useTheme(); reach for this only when the layout itself diverges.
 */
export default function useDesign() {
  const design = useAppSelector(getSelectedTheme);

  return {
    design,
    isCorporate: design === 'corporate',
  } as const;
}
