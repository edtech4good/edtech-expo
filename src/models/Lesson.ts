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
    questionfeedback?: {
      correctmessage: string | null;
      incorrectmessage: string | null;
    } | null;
  };
  questionoptions: QuestionOption[];
  questionstatus: boolean;
  questiontags: string[];
  questiontext: string;
  questioncorrectvalue: string;
  questionfeedback?: {
    correctmessage: string | null;
    incorrectmessage: string | null;
  } | null;
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

export type ActivityStatus = 'done' | 'inProgress' | 'todo';

export interface LearningActivityProgress {
  lessonlearningid: string;
  status: ActivityStatus;
  progress_percentage: number;
}

export interface PracticeActivityProgress {
  lessonpracticeid: string;
  status: ActivityStatus;
  attempts: number;
  best_percentage: number | null;
  /** Number of questions in the practice. Added alongside in-lesson status; optional because older/cached responses may not include it. */
  question_count?: number;
}

export interface QuizActivityProgress {
  lessonquizid: string;
  status: ActivityStatus;
  attempts: number;
  best_percentage: number | null;
  /** Number of questions in the quiz. Added alongside in-lesson status; optional because older/cached responses may not include it. */
  question_count?: number;
}

export interface LessonActivityProgress {
  lessonid: string;
  pass_percentage: number;
  learnings: LearningActivityProgress[];
  practices: PracticeActivityProgress[];
  quizzes: QuizActivityProgress[];
}

// GET lesson/level/:levelid/steps — the multi-lesson sibling of
// lesson/:lessonid/activities/progress (LessonActivityProgress above): same
// per-item shape (learnings/practices/quizzes), but one entry per lesson in
// the level, plus lessonorder so structure can be cached without a second
// lookup. Used to build real per-step dots on Level Detail instead of the
// `approximateSteps` guess.
export interface LevelStepsLesson {
  lessonid: string;
  lessonorder: number;
  learnings: LearningActivityProgress[];
  practices: PracticeActivityProgress[];
  quizzes: QuizActivityProgress[];
}

export interface LevelSteps {
  levelid: string;
  pass_percentage: number;
  lessons: LevelStepsLesson[];
}

export interface Lesson {
  brick_points: number;
  // Server-computed completion, based on the lesson's pass mark (e.g. 80/100
  // points), not on `progress` reaching 100. Optional because cached/older
  // API responses may not include it.
  completed?: boolean;
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
