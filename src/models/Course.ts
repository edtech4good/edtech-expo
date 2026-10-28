import { ContentText } from './Content';

export interface Course extends ContentText {
  curriculumid: string;
  gradedescription: string;
  gradeid: string;
  gradename: string;
  gradeorder: number;
  gradestatus: boolean;
  isdeleted: boolean;
  number_levels: number;
  passing_points: number;
  points: number;
  progress: number;
  progress_points: number;
}
