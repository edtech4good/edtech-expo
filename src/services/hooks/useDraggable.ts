import { DraggableProps } from '@/models';
import { createContext, useContext } from 'react';

export const DraggableContext = createContext<DraggableProps | undefined>(
  undefined,
);

export function useDraggable() {
  return useContext<DraggableProps | undefined>(DraggableContext);
}
