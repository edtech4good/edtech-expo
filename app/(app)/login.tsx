import { LoginScreen } from '@/screens';

/**
 * Prefilled in __DEV__ only. Outside __DEV__ the values below are compiled
 * away, so they are removed from release bundles (not merely ignored by
 * LoginScreen); keep the `process.env` reads inside the __DEV__ branch, or the
 * inlined values survive minification.
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
const DEMO_STUDENT = __DEV__
  ? {
      username:
        process.env.EXPO_PUBLIC_DEV_LOGIN_USERNAME?.trim() || 'demo.student',
      password: process.env.EXPO_PUBLIC_DEV_LOGIN_PASSWORD?.trim() || 'demo',
    }
  : { username: '', password: '' };

export default function Login() {
  return (
    <LoginScreen
      devUsername={DEMO_STUDENT.username}
      devPassword={DEMO_STUDENT.password}
    />
  );
}
