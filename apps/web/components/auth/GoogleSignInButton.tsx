'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: object) => void;
          renderButton: (el: HTMLElement, config: object) => void;
          prompt: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
}

export function GoogleSignInButton({ onSuccess }: GoogleSignInButtonProps = {}) {
  const router = useRouter();
  const divRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const initialized = useRef(false);

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      try {
        await api.auth.google(response.credential);
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [router, onSuccess],
  );

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !divRef.current || initialized.current) return;

    const setupGoogleBtn = () => {
      if (!window.google || !divRef.current || initialized.current) return;
      initialized.current = true;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });

      divRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(divRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        width: '300',
      });
    };

    if (window.google) {
      setupGoogleBtn();
      return;
    }

    const scriptId = 'google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', setupGoogleBtn);
    return () => {
      script?.removeEventListener('load', setupGoogleBtn);
    };
  }, [handleCredentialResponse]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={divRef} className="w-full flex justify-center min-h-11" />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
        <p className="text-xs text-foreground/40">
          (Google Client ID not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID)
        </p>
      )}
    </div>
  );
}
