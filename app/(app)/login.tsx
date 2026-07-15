import { LoginScreen } from '@/screens';

/** Prefilled in __DEV__ only — matches `npm run seed:demo` in edtech-lms-rpi-api */
const DEMO_STUDENT = {
  username: 'demo.student',
  password: 'demo',
};

export default function Login() {
  return (
    <LoginScreen
      devUsername={DEMO_STUDENT.username}
      devPassword={DEMO_STUDENT.password}
    />
  );
}
