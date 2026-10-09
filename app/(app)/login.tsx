import { LoginScreen } from '@/screens';

/**
 * Prefilled in __DEV__ only (LoginScreen ignores these outside __DEV__).
 *
 * The fallbacks match a student API seeded locally by `npm run seed:demo` in
 * edtech-lms-rpi-api. A server fed from central's seeds has the learners
 * central's own seed scripts create instead, so set
 * EXPO_PUBLIC_DEV_LOGIN_USERNAME / EXPO_PUBLIC_DEV_LOGIN_PASSWORD in `.env`
 * (see env.example) to match the server your dev build points at. A blank
 * value falls back to the default. Expo inlines EXPO_PUBLIC_* at bundle time,
 * so these must be read as literal `process.env.NAME` accesses, and a change
 * needs a restart with `npx expo start -c`.
 */
const envUsername = process.env.EXPO_PUBLIC_DEV_LOGIN_USERNAME?.trim();
const envPassword = process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD?.trim();
const DEMO_STUDENT = {
  username: envUsername || 'demo.student',
  password: envPassword || 'demo',
};

export default function Login() {
  return (
    <LoginScreen
      devUsername={DEMO_STUDENT.username}
      devPassword={DEMO_STUDENT.password}
    />
  );
}
