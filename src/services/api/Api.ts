import {
  BaselineCurriculumPayload,
  CourseIndexResponse,
  CourseResponse,
  CurriculumResponse,
  BrandingResponse,
  EdtechLoginPayload,
  EdtechLoginResponse,
  LessonActivityProgressResponse,
  LessonLearningResponse,
  LessonListResponse,
  LessonPracticeResponse,
  LessonQuizResponse,
  LessonResponse,
  LevelIndexResponse,
  LevelResponse,
  LmsLoginPayload,
  PracticeResult,
  QuizResult,
  StandardResponse,
  SubjectResponse,
  TeacherProfileResponse,
  TeacherStudentProgressPayload,
  TeacherStudentProgressResponse,
  UnitResponse,
  VideoProgressPayload,
} from '@/models';
import apisauce, {
  ApiResponse,
  ApisauceInstance,
  HEADERS,
  AsyncRequestTransform,
  AsyncResponseTransform,
} from 'apisauce';
import _ from 'lodash';

// Header names are case-insensitive over HTTP, but plain-object keys aren't
// — apisauce/axios store whatever casing setHeaders() was called with
// (lowercase 'authorization' here), so a fixed-case replacement key would
// leave the real one (and the bearer token) sitting in the spread. Redact
// by matching case-insensitively instead.
function redactAuthHeader(headers: Record<string, any> | undefined) {
  const redacted = { ...headers };
  Object.keys(redacted).forEach(key => {
    if (key.toLowerCase() === 'authorization') {
      redacted[key] = '[redacted]';
    }
  });
  return redacted;
}

const requestTransform: AsyncRequestTransform = async request => {
  if (
    request.url?.includes('log/import') ||
    request.url?.includes('import/master')
  )
    request.headers = {
      ...request.headers,
      'Content-Type': 'multipart/form-data',
    };
  else
    request.headers = {
      ...request.headers,
      'Content-Type': 'application/json',
    };

  // Dev-only diagnostics. Even in dev, never log the Authorization header —
  // it carries the bearer token.
  if (__DEV__) {
    const requestPayload = {
      baseURL: request.baseURL,
      url: request.url,
      payload: request.data,
      params: request.params,
      header: redactAuthHeader(request.headers),
    };
    console.log(
      `%cMaking API Request ${request.url}`,
      'color: yellow;font-weight: bold;',
    );
    console.log('Request: ', requestPayload);
  }
};

function resolveExpoPublicUrl(
  value: string | undefined,
  envName: string,
  devFallback: string,
): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(
      `[Api] ${envName} is empty — using ${devFallback}. Set it in edtech-expo/.env and restart Expo (npx expo start -c).`,
    );
    return devFallback;
  }
  return '';
}

const responseTransform: AsyncResponseTransform = async response => {
  const requestResponse = {
    Status: response.status,
    Message: _.get(response, 'data.message', ''),
    Data: _.get(response, 'data.data', response.data),
    Header: _.get(response, 'headers', {}),
    Url: `${response.config?.baseURL}${response.config?.url}`,
  };

  // Dev-only diagnostics. Never spread `response` or `response.originalError`
  // whole — apisauce's `originalError` is the underlying AxiosError, which
  // carries its own `.config.headers` (the same Authorization header used
  // for the request, unredacted) at a depth `console.log`'s object inspector
  // happily expands. Log an explicit, reduced object instead.
  if (__DEV__) {
    const loggedResponse = {
      ok: response.ok,
      status: response.status,
      problem: response.problem,
      message: response.originalError?.message,
      url: `${response.config?.baseURL ?? ''}${response.config?.url ?? ''}`,
      data: response.data,
      headers: redactAuthHeader(response.config?.headers),
    };
    console.log(
      `%cResponse from ${response.config?.url}`,
      'color: lightgreen;font-weight: bold;',
    );
    console.log('Response: ', loggedResponse);
  }

  // if (response.status === 404 || response.status === 401)
  //   return router.replace('/login?isLoggedOut=true');
  if (!response.ok) {
    const base = response.config?.baseURL ?? '';
    const path = response.config?.url ?? '';
    const fullUrl = `${base}${path}`;
    const problem = response.problem;
    if (
      problem === 'NETWORK_ERROR' ||
      problem === 'CONNECTION_ERROR' ||
      problem === 'TIMEOUT_ERROR'
    ) {
      const err = new Error(
        `Cannot reach API at ${fullUrl || '(missing EXPO_PUBLIC_BASE_URL)'}. ` +
          'Is edtech-lms-rpi-api running on that host/port (Lane C: http://127.0.0.1:3001)? ' +
          'After changing .env, restart Metro with npx expo start -c. ' +
          'On a phone or some emulators, use your computer LAN IP instead of localhost.',
      );
      (err as any).status = response.status;
      (err as any).problem = response.problem;
      throw err;
    }
    const fromAxios = (response.originalError as Error | undefined)?.message;
    const fromBody = _.get(response.data, 'message');
    const msg = fromAxios || fromBody || problem || 'Request failed';
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    (err as any).status = response.status;
    (err as any).problem = response.problem;
    // The APIs' error body is { error, errormessage, data } (their
    // GlobalExceptionFilter); `msg` above is almost always axios' generic
    // "Request failed with status code N", so expose the server's own
    // message separately. Used by the offline queue to tell a permanent
    // learning-progress 400 from a transient one (pendingResultsQueue.ts).
    const serverMessage = _.get(response.data, 'errormessage');
    if (typeof serverMessage === 'string') {
      (err as any).serverMessage = serverMessage;
    }
    throw err;
  }
};

export default class Api {
  readonly apiSauceInstance: ApisauceInstance;
  readonly lmsApiInstance: ApisauceInstance;
  readonly sampleInstance: ApisauceInstance;
  readonly LIST_PER_PAGE = 20;
  readonly REQUEST_TIMEOUT_LENGTH = 120000;

  constructor() {
    this.apiSauceInstance = apisauce.create({
      baseURL: resolveExpoPublicUrl(
        process.env.EXPO_PUBLIC_BASE_URL,
        'EXPO_PUBLIC_BASE_URL',
        'http://127.0.0.1:3001',
      ),
      headers: {
        'Cache-Control': 'no-cache',
        'Accept-Language': 'en',
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
      timeout: this.REQUEST_TIMEOUT_LENGTH,
    });

    this.lmsApiInstance = apisauce.create({
      baseURL: resolveExpoPublicUrl(
        process.env.EXPO_PUBLIC_SYNC_URL,
        'EXPO_PUBLIC_SYNC_URL',
        'http://127.0.0.1:3000',
      ),
      headers: {
        'Cache-Control': 'no-cache',
        'Accept-Language': 'en',
        Accept: '*/*',
      },
      timeout: this.REQUEST_TIMEOUT_LENGTH,
    });

    this.sampleInstance = apisauce.create({
      baseURL: 'https://reqbin.com',
      timeout: this.REQUEST_TIMEOUT_LENGTH,
    });

    this.apiSauceInstance.addAsyncRequestTransform(requestTransform);
    this.apiSauceInstance.addAsyncResponseTransform(responseTransform);
    this.lmsApiInstance.addAsyncRequestTransform(requestTransform);
    this.lmsApiInstance.addAsyncResponseTransform(responseTransform);
    this.sampleInstance.addAsyncRequestTransform(requestTransform);
    this.sampleInstance.addAsyncResponseTransform(responseTransform);
  }

  setHeaders(headers: HEADERS): void {
    this.apiSauceInstance.setHeaders(headers);
    this.lmsApiInstance.setHeaders(headers);
  }

  // Logout must remove the token from both apisauce instances, not just the
  // redux store — setHeaders() only ever adds/overwrites headers, so a
  // stale authorization header otherwise survives sign-out and keeps
  // authenticating requests made after logout.
  clearAuthHeader(): void {
    this.apiSauceInstance.deleteHeader('authorization');
    this.lmsApiInstance.deleteHeader('authorization');
  }

  /**
   *
   * 400 = unmatch credential
   * 404 = not found
   * 500 = server error
   */
  async login(
    payload: EdtechLoginPayload,
  ): Promise<ApiResponse<EdtechLoginResponse, EdtechLoginResponse>> {
    return this.apiSauceInstance.post<EdtechLoginResponse>(
      '/auth/login',
      payload,
    );
  }

  // Per-school UI theme + branding, resolved by school name. Always 200;
  // unknown school names fall back to the kids theme server-side.
  async fetchBranding(
    schoolName: string,
  ): Promise<ApiResponse<BrandingResponse, BrandingResponse>> {
    return this.apiSauceInstance.get<BrandingResponse>('school/branding', {
      schoolname: schoolName,
    });
  }

  async lmsLogin(
    payload: LmsLoginPayload,
  ): Promise<ApiResponse<EdtechLoginResponse, EdtechLoginResponse>> {
    return this.lmsApiInstance.post<EdtechLoginResponse>(
      '/auth/school/login',
      payload,
    );
  }
  // First fetch Subject
  async fetchSubjects(): Promise<
    ApiResponse<SubjectResponse, SubjectResponse>
  > {
    return this.apiSauceInstance.get<SubjectResponse>('curriculum/subjects');
  }

  // Second fetch Course using SubjectId
  async fetchCourses(
    curriculumId: string,
  ): Promise<ApiResponse<CourseResponse, CourseResponse>> {
    return this.apiSauceInstance.get<CourseResponse>(
      `grade/curriculum/${curriculumId}`,
    );
  }

  // Third fetch Unit using CourseId
  async fetchUnits(
    courseId: string,
  ): Promise<ApiResponse<UnitResponse, UnitResponse>> {
    return this.apiSauceInstance.get<UnitResponse>(`level/grade/${courseId}`);
  }

  // Fetch every level row, unscoped by course — used to resolve a level's
  // header data when the redux selection doesn't cover the requested id
  // (e.g. a deep reload / shared link with no selection in the store).
  async fetchAllUnits(): Promise<
    ApiResponse<LevelIndexResponse, LevelIndexResponse>
  > {
    return this.apiSauceInstance.get<LevelIndexResponse>('level/all');
  }

  // Fetch every course row, unscoped by curriculum — see fetchAllUnits.
  async fetchAllCourses(): Promise<
    ApiResponse<CourseIndexResponse, CourseIndexResponse>
  > {
    return this.apiSauceInstance.get<CourseIndexResponse>('grade/all');
  }

  // Fourth fetch Level using UnitId
  async fetchLevels(
    unitId: string,
  ): Promise<ApiResponse<LevelResponse, LevelResponse>> {
    return this.apiSauceInstance.get<LevelResponse>(`lesson/level/${unitId}`);
  }

  // Finally fetch Chapters using LevelId
  async fetchChapters(
    lessonId: string,
  ): Promise<ApiResponse<LessonResponse, LessonResponse>> {
    return this.apiSauceInstance.get<LessonResponse>(
      `lesson/${lessonId}/learning`,
    );
  }

  // Per-activity status/progress for a lesson (learnings/practices/quizzes),
  // used to render status icons and the "next activity" CTA. See
  // src/models/Lesson.ts LessonActivityProgress for the shape.
  async fetchActivityProgress(
    lessonId: string,
  ): Promise<
    ApiResponse<LessonActivityProgressResponse, LessonActivityProgressResponse>
  > {
    return this.apiSauceInstance.get<LessonActivityProgressResponse>(
      `lesson/${lessonId}/activities/progress`,
    );
  }

  // Use to fetch the video content for lesson
  async fetchVideoPath(
    lessonLearningId: string,
  ): Promise<ApiResponse<LessonLearningResponse, LessonLearningResponse>> {
    return this.apiSauceInstance.get<LessonLearningResponse>(
      `lesson/learning/${lessonLearningId}`,
    );
  }

  // Save student video progress
  async saveVideoProgress(
    lessonLearningid: string,
    progress: VideoProgressPayload,
  ): Promise<any> {
    return this.apiSauceInstance.post(
      `lesson/learning/${lessonLearningid}/progress`,
      progress,
    );
  }

  // Use to fetch the practice content
  async fetchPractice(
    lessonPracticeId: string,
  ): Promise<ApiResponse<LessonPracticeResponse, LessonPracticeResponse>> {
    return this.apiSauceInstance.get<LessonPracticeResponse>(
      `question/practice/${lessonPracticeId}`,
    );
  }

  // Use to fetch the quiz content
  async fetchQuiz(
    lessonQuizId: string,
  ): Promise<ApiResponse<LessonQuizResponse, LessonQuizResponse>> {
    return this.apiSauceInstance.get<LessonQuizResponse>(
      `question/quiz/${lessonQuizId}`,
    );
  }

  async savePracticeResult(
    lessonPracticeId: string,
    result: PracticeResult,
  ): Promise<any> {
    return this.apiSauceInstance.post(
      `result/lesson/practice/${lessonPracticeId}`,
      result,
    );
  }

  async saveQuizResult(lessonQuizId: string, result: QuizResult) {
    return this.apiSauceInstance.post(
      `result/lesson/quiz/${lessonQuizId}`,
      result,
    );
  }

  async fetchBaselineCurriculum({
    curriculumid,
    schoolname,
    studentid,
    baselineDateTime,
  }: BaselineCurriculumPayload): Promise<any> {
    return this.apiSauceInstance.post(
      `curriculum/baseline/${curriculumid}/${schoolname}/${studentid}`,
      { baselineDateTime },
    );
  }

  async trashStudentProgress(): Promise<any> {
    return this.apiSauceInstance.get('student/progress');
  }

  // LMS Related

  async fetchStandard(
    schoolName: string,
  ): Promise<ApiResponse<StandardResponse, StandardResponse>> {
    return this.apiSauceInstance.get<StandardResponse>('teacher/standard/all', {
      schoolname: schoolName,
    });
  }

  async fetchCurriculum(
    schoolName: string,
  ): Promise<ApiResponse<CurriculumResponse, CurriculumResponse>> {
    return this.apiSauceInstance.get<CurriculumResponse>('curriculum/all', {
      schoolname: schoolName,
    });
  }

  async fetchCourse(
    curId: string,
  ): Promise<ApiResponse<CourseResponse, CourseResponse>> {
    return this.apiSauceInstance.get<CourseResponse>('grade/all', {
      curid: curId,
    });
  }

  async fetchLevel(
    courseId: string,
  ): Promise<ApiResponse<UnitResponse, UnitResponse>> {
    return this.apiSauceInstance.get<UnitResponse>('level/all', {
      gradeid: courseId,
    });
  }

  async fetchLesson(
    levelId: string,
  ): Promise<ApiResponse<LessonListResponse, LessonListResponse>> {
    return this.apiSauceInstance.get<LessonListResponse>('lesson/all', {
      levelid: levelId,
    });
  }

  async fetchStudentProgress(
    payload: TeacherStudentProgressPayload,
  ): Promise<
    ApiResponse<TeacherStudentProgressResponse, TeacherStudentProgressResponse>
  > {
    return this.apiSauceInstance.post<TeacherStudentProgressResponse>(
      'teacher/studentprogress',
      payload,
    );
  }

  async fetchTeacherProfile(
    standardId: string,
  ): Promise<ApiResponse<TeacherProfileResponse, TeacherProfileResponse>> {
    return this.apiSauceInstance.get<TeacherProfileResponse>(
      'teacher/profile',
      {
        standard: standardId,
      },
    );
  }

  async fetchStudentList(standardId: string) {
    return this.apiSauceInstance.get('teacher/customstudents');
  }

  async fetchCountries() {}

  async fetchSchools() {}

  async fetchCurriculums() {}

  async fetchGrades() {}

  async downloadDataFromRpi() {
    return this.apiSauceInstance.get('export/log');
  }

  async uploadToCloud(payload) {
    return this.lmsApiInstance.put('log/import', payload);
  }

  async uploadToRpi(payload) {
    return this.apiSauceInstance.put('import/master', payload);
  }

  async Ping() {
    return this.sampleInstance.put('/echo/put/json', {
      Id: 12345,
      Customer: 'John Smith',
      Quantity: 1,
      Price: 10.0,
    });
  }
}
