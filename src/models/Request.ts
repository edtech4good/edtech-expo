export interface LoginPayload {
  username: string;
  password: string;
}

export interface EdtechLoginPayload {
  studentusername: string;
  studentpassword: string;
  logintime: number;
}

export interface LmsLoginPayload {
  lmsusername: string;
  lmsuserpassword: string;
}

export interface BaselineCurriculumPayload {
  curriculumid: string;
  schoolname: string;
  studentid: string;
  baselineDateTime: string;
}

export interface VideoProgressPayload {
  // current video progress
  time: number;
  // has it ended?
  ended: boolean;
  // video actual length
  content_length: number;
  // current timestamp
  date: number;
}

export interface TeacherStudentProgressPayload {
  pageindex: number;
  pagesize: number;
  teacherScoreRequestFilterList: Record<string, string>[];
}
