'use client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const { loading, isAuthenticated } = useAuth({ redirectIfFound: true });

  if (loading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/50">Checking session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-accent mb-2">ভাইফোঁটা</h1>
          <p className="text-foreground/60">Sign in to celebrate with your sibling</p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-4">
          <h2 className="text-xl font-semibold">Welcome</h2>
          <p className="text-sm text-foreground/50">
            We use Google Sign-in to verify your identity and keep your room private.
          </p>
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
