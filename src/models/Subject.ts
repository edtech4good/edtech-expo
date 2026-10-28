import { ContentText } from './Content';

export interface Subject extends ContentText {
  curriculumdescription: string;
  curriculumid: string;
  curriculumname: string;
  curriculumstatus: boolean;
  isdeleted: boolean;
  progress: number;
  subjectid: string;
}
