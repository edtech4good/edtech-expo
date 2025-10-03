import { createContext, useContext } from 'react';
import { LayoutRectangle } from 'react-native';

export const ParentLayoutContext = createContext<LayoutRectangle | undefined>(
  undefined,
);

export function useParentLayout() {
  return useContext<LayoutRectangle | undefined>(ParentLayoutContext);
}
