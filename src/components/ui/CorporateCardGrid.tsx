import { useBreakpoint } from '@/services';
import { FlatList, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import CurriculumCard, { CurriculumCardProps } from './CurriculumCard';

export interface CorporateCardGridItem extends CurriculumCardProps {
  /** Stable list key (the item's id). */
  key: string;
}

export interface CorporateCardGridProps {
  items: CorporateCardGridItem[];
}

const GRID_GAP = 20;

/**
 * The corporate list-screen body: a responsive CurriculumCard grid
 * (1/2/3 columns, 20px gap, 1024px max width) shared by the
 * Subjects/Courses/Units/Levels screens' corporate branches.
 *
 * Anything interactive that must survive per-keystroke re-renders (like the
 * Subjects search field) belongs OUTSIDE this component as a sibling —
 * VirtualizedList re-mounts header cells when the list re-renders, which
 * tears down input DOM nodes and drops focus.
 */
export default function CorporateCardGrid({ items }: CorporateCardGridProps) {
  const theme = useTheme();
  const columns =
    useBreakpoint({ mobile: 1, phablet: 2, tablet: 3, desktop: 3 }) ?? 3;

  const renderItem = ({ item }: { item: CorporateCardGridItem }) => {
    const { key: _key, ...cardProps } = item;
    return (
      <View style={{ flex: 1, maxWidth: `${100 / columns}%` }}>
        <CurriculumCard {...cardProps} />
      </View>
    );
  };

  return (
    <FlatList
      key={`corporate-grid-${columns}`}
      style={{ flex: 1, width: '100%', maxWidth: 1024 }}
      contentContainerStyle={{
        paddingHorizontal: theme.layouts.pageHorizontalPadding,
        paddingVertical: theme.layouts.pageVerticalPadding,
      }}
      data={items}
      numColumns={columns}
      {...(columns > 1 ? { columnWrapperStyle: { gap: GRID_GAP } } : {})}
      ItemSeparatorComponent={GridSpacer}
      renderItem={renderItem}
      keyExtractor={item => item.key}
    />
  );
}

const GridSpacer = () => <View style={{ height: GRID_GAP }} />;

/**
 * The APIs report progress as 0–100; CurriculumCard wants 0–1. Returns
 * undefined for missing/zero progress so cards skip the pill and bar.
 */
export function normalizeProgressFraction(
  progress: number | undefined | null,
): number | undefined {
  if (typeof progress !== 'number' || progress <= 0) return undefined;
  return progress > 1 ? progress / 100 : progress;
}
