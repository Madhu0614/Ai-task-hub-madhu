import SignUpForm from '@/components/auth/signup-form';
import { Toaster } from '@/components/ui/toaster';

export default function SignUpPage() {
  return (
    <>
      <SignUpForm />
      <Toaster />
    </>
  );
}