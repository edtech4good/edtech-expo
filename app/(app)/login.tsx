import __ci_mutation_missing_asset from '../../src/assets/images/this-file-does-not-exist-ci-mutation.png';
import { LoginScreen } from '@/screens';

/** Prefilled in __DEV__ only — matches `npm run seed:demo` in edtech-lms-rpi-api */
const DEMO_STUDENT = {
  username: 'demo.student',
  password: 'demo',
};

// CI mutation-proof: forces the bundler to actually resolve the missing
// asset above instead of tree-shaking the unused import away.
console.log('__ci_mutation_missing_asset', __ci_mutation_missing_asset);

export default function Login() {
  return (
    <LoginScreen
      devUsername={DEMO_STUDENT.username}
      devPassword={DEMO_STUDENT.password}
    />
  );
}
