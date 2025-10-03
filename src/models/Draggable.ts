import { Animated } from 'react-native';
import { QuestionOption } from './Lesson';

export interface Offset {
  x: number;
  y: number;
}

export interface Measurement extends Offset {
  width: number;
  height: number;
}

export interface EdgeOffset {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface DropAreaProps {
  id: string;
  measurement: Measurement;
  edge: EdgeOffset;
}

export interface DraggableProps<T> {
  id: string;
  isDragging: boolean;
  position: Animated.ValueXY;
  measurement?: Measurement;
  edge?: EdgeOffset;
  currentOffset?: Offset;
  origin?: Offset;
  pointerOffset?: Offset;
  value?: T;
}

export interface DraggableWrapper<T> {
  id: string;
  currentPosition: Animated.ValueXY;
  isDraggin: boolean;
}

export interface DraggableHandler {
  updateOffset: (updateOrigin: boolean) => Promise<Offset>;
  moveTo: (dest: Offset) => void;
  resetPosition: () => void;
}

export interface DropItemHandler {
  select: (val: QuestionOption) => void;
  deselect: () => void;
  retrieveValue: () => QuestionOption | undefined;
}

export interface DropitemProps {
  option: QuestionOption;
  disabled?: boolean;
  onPress: () => void;
}

export interface MatchingItemHandler {
  select: () => void;
  deselect: () => void;
  hide: () => void;
  show: () => void;
}

export interface MatchingItemProps {
  option: QuestionOption;
  isSelected?: boolean;
  disabled?: boolean;
  onPress: (val: QuestionOption) => void;
}
