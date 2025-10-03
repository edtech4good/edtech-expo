import { TemplateTypeById } from '../constants/QuestionTemplate';

export interface File {
  fileext: string;
  filename: string;
  filetype: number;
}

export interface LessonLearning {
  lessonlearningid: string;
  lessonlearningname: string;
  lessonlearningorder: number;
}

export interface StudentLearningProgress {
  content_length: number;
  lastupdated: string;
  lessonlearningid: string;
  points: number;
  progress: number;
  progress_percentage: number;
  studentid: string;
  studentlearningprogressid: string;
  userid: number;
  viewed: number;
}

export interface LessonLearningResource extends LessonLearning {
  documentid: string;
  lessonid: string;
  lessonlearningdescription: string;
  lessonlearningofileobject: File;
  lessonlearningstatus: boolean;
  points: number;
  studentlearningprogress: StudentLearningProgress;
}

export interface QuestionDistractor {
  questiondistractorid: string;
  questiondistractortext: string;
}

export interface QuestionAssociate {
  questionassociatefile: File;
  questionassociatetext: string;
  questionoptionid: string;
}
export interface QuestionOption {
  questionassociate: QuestionAssociate;
  questionoptiondenominatorisstatic: boolean;
  questionoptiondenominatorvalue: string;
  questionoptionfile: File;
  questionoptionid: string;
  questionoptioniscorrect: boolean;
  questionoptionisfraction: boolean;
  questionoptionisstaticfile: boolean;
  questionoptionistext: boolean;
  questionoptionnumeratorisstatic: boolean;
  questionoptionnumeratorvalue: string;
  questionoptionsequence: number;
  questionoptiontext: string;
  questionoptionvalue: string;
}

export interface QuestionHeading {
  headingfile: File;
  headingtext: string;
}

export interface Question {
  isdeleted: boolean;
  lastupdated: string;
  questiondistractors: QuestionDistractor[];
  questionfile: File;
  questionheading: QuestionHeading;
  questionnid: string;
  questionidentifier: string;
  questionobject: {
    questiondistractors: QuestionDistractor[];
    questionfile: File;
    questionheading: QuestionHeading;
    questionoptions: QuestionOption[];
    questiontext: string;
    questioncorrectvalue: string;
  };
  questionoptions: QuestionOption[];
  questionstatus: boolean;
  questiontags: string[];
  questiontext: string;
  questioncorrectvalue: string;
  templatetypeid: keyof typeof TemplateTypeById;
}

export interface LessonPractice {
  lessonpracticeid: string;
  lessonpracticename: string;
  lessonpracticeorder: number;
}

export interface LessonPracticeResource {
  lessonpracticeid: string;
  lessonpracticequestionid: string;
  lessonpracticequestionorder: number;
  lessonpracticequestionstatus: boolean;
  question: Question;
  questionid: string;
}

export interface LessonQuizResource {
  lessonquizid: string;
  lessonquizquestionid: string;
  lessonquizquestionorder: number;
  lessonquizquestionstatus: boolean;
  question: Question;
  questionid: string;
}

export interface LessonQuiz {
  lessonquizid: string;
  lessonquizname: string;
  lessonquizorder: number;
}

export interface Lesson {
  brick_points: number;
  isdeleted: boolean;
  learning_points: number;
  lessondescription: string;
  lessonheading: string;
  lessonid: string;
  lessonlearnings: LessonLearning[];
  lessonname: string;
  lessonorder: number;
  lessonpasspercentage: number;
  lessonpractices: LessonPractice[];
  lessonquizzes: LessonQuiz[];
  lessonstatus: boolean;
  levelid: string;
  passing_points: number;
  practicecount: number;
  practices_points: number;
  progress: number;
  quizcount: number;
  quizzes_points: number;
  total_points: number;
}
