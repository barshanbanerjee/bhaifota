'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { User } from '@/types';

export function useAuth(options?: { requireAuth?: boolean; redirectIfFound?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('bhaifota_user') : null;
      const token = typeof window !== 'undefined' ? localStorage.getItem('bhaifota_token') : null;

      if (!token) {
        setUser(null);
        setLoading(false);
        if (options?.requireAuth) {
          router.replace('/login');
        }
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          // ignore parse error
        }
      }

      // Verify and refresh user from server
      const freshUser = await api.users.me();
      setUser(freshUser as User);

      if (options?.redirectIfFound) {
        router.replace('/dashboard');
      }
    } catch {
      api.clearToken();
      setUser(null);
      if (options?.requireAuth) {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [options?.requireAuth, options?.redirectIfFound, router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return { user, loading, logout, isAuthenticated: !!user };
}

