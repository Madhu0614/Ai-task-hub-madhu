import LoginForm from '@/components/auth/login-form';
import { Toaster } from '@/components/ui/toaster';

export default function LoginPage() {
  return (
    <>
      <LoginForm />
      <Toaster />
    </>
  );
}