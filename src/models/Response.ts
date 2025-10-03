import { Course } from './Course';
import { Curriculum } from './Curriculum';
import {
  Lesson,
  LessonLearningResource,
  LessonPracticeResource,
  LessonQuizResource,
} from './Lesson';
import { Level } from './Level';
import {
  StudentOverallProgress,
  StudentProfile,
  TeacherProfile,
} from './Profile';
import { Standard } from './Standard';
import { Subject } from './Subject';
import { Unit } from './Unit';

export interface EdtechLoginResponse {
  data: { accessToken: string };
}

export interface SubjectResponse {
  data: Subject[];
}

export interface CourseResponse {
  data: Course[];
}

export interface UnitResponse {
  data: Unit[];
}

export interface LevelResponse {
  data: Level;
}

export interface LessonResponse {
  data: Lesson;
}

export interface LessonListResponse {
  data: Lesson[];
}

export interface LessonLearningResponse {
  data: LessonLearningResource;
}

export interface LessonPracticeResponse {
  data: LessonPracticeResource[];
}

export interface LessonQuizResponse {
  data: LessonQuizResource[];
}

export interface StandardResponse {
  data: Standard[];
}

export interface CurriculumResponse {
  data: Curriculum[];
}

export interface TeacherProfileResponse {
  data: TeacherProfile;
}

export interface TeacherStudentProgress {
  data: StudentProfile[];
  total: number;
  pageindex: number;
  pagesize: number;
}

export interface TeacherStudentProgressResponse {
  data: TeacherStudentProgress;
}
