import { Lesson } from './Lesson';

export interface LevelDescription {
  leveldescription: string;
  levelid: string;
  levelname: string;
  progress: number;
}

export interface Level {
  lesson: Lesson[];
  level: LevelDescription;
  level_has_quiz: boolean;
}
