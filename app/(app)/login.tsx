import { LoginScreen } from '@/screens';

/**
 * Prefilled in __DEV__ only (LoginScreen ignores these outside __DEV__).
 *
 * The fallbacks match a LOCAL student API seeded by `npm run seed:demo` in
 * edtech-lms-rpi-api. A shared or deployed environment (UAT, say) is seeded
 * differently, so `demo.student` does not exist there: set
 * EXPO_PUBLIC_DEV_LOGIN_USERNAME / EXPO_PUBLIC_DEV_LOGIN_PASSWORD in `.env`
 * (see env.example). Expo inlines EXPO_PUBLIC_* at bundle time, so these must
 * be read as literal `process.env.NAME` accesses, and a change needs a
 * restart with `npx expo start -c`.
 */
const DEMO_STUDENT = {
  username: process.env.EXPO_PUBLIC_DEV_LOGIN_USERNAME ?? 'demo.student',
  password: process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD ?? 'demo',
};

export default function Login() {
  return (
    <LoginScreen
      devUsername={DEMO_STUDENT.username}
      devPassword={DEMO_STUDENT.password}
    />
  );
}
