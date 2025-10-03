import { EdtechLoginPayload, LmsLoginPayload, LoginPayload } from '@/models';

export const toAuthPayload = (payload: LoginPayload, isTeacher = false) => {
  if (!isTeacher)
    return {
      logintime: new Date().getTime(),
      studentpassword: payload.password,
      studentusername: payload.username,
    } as EdtechLoginPayload;

  return {
    lmsusername: payload.username,
    lmsuserpassword: payload.password,
  } as LmsLoginPayload;
};
