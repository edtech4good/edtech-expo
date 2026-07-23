export interface Profile {
  baselineid: number;
  baselinepassed: boolean;
  city: string;
  claims: string;
  contact: string;
  country: string;
  curriculumid: string;
  curriculumids: string[];
  dateofbirth: string;
  dateofjoin: string;
  exp: number;
  familyname: string;
  fathername: string;
  genderid: number;
  iat: number;
  is_teacher_acc: false;
  jti: string;
  mothername: string;
  profileimage: string;
  schoolname: string;
  schooltype: string;
  schooluserid: string;
  schoolusername: string;
  schooluserrole: number;
  standard: string;
  startinglevelid: number;
  state: string;
  studentcurrentlessonid: number;
  studentcurrentlevelid: number;
  studentfirstname: string;
  studentid: string;
  studentlastname: string;
  sub: string;
  uitheme?: 'kids' | 'corporate';
  schoolid?: string | null;
}

export interface StudentProgress {
  data: number;
}

export interface TeacherProfile {
  averagestudentusage: number;
  numberofstudents: number;
  teacher: {
    logintime: string;
    rpiuseraccesses: { logintime: string }[];
    schoolname: string;
    schooluserid: string;
    schoolusername: string;
  };
}

export interface StudentOverallProgress {
  scores: number;
  resultpercentage: number;
  marks: number;
  ispass: number;
  totalquestions: number;
}

export interface StudentProfile {
  studentid: string;
  studentfirstname: string;
  studentlastname: string;
  schooluserid: string;
  studentlessonsprogresses: [];
  studentprogress: StudentOverallProgress;
  index: number;
  schooluser: { schoolusername: string };
}
