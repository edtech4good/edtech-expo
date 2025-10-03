import { LoginScreen } from '@/screens';

// Development credentials - replace with your actual test credentials
const TEACHER_CREDENTIAL = {
  username: 'your-teacher-username',
  password: 'your-teacher-password',
};

const EDTECH_USER = {
  username: 'your-edtech-username',
  password: 'your-edtech-password',
};

const GNC_USER = {
  username: 'your-gnc-username',
  password: 'your-gnc-password',
};

export default function Login() {
  return (
    <LoginScreen
      devPassword={EDTECH_USER.username}
      devUsername={EDTECH_USER.password}
    />
  );
}
