const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('bhaifota_token');
  }

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bhaifota_token', token);
    }
  }

  clearToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bhaifota_token');
      localStorage.removeItem('bhaifota_user');
    }
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers,
      ...options,
    });

    if (!res.ok) {
      if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth')) {
        this.clearToken();
      }
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  auth = {
    google: async (idToken: string) => {
      const data = await this.request<{
        user: { id: string; email: string; name: string; image?: string };
        token: string;
      }>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      if (data.token) {
        this.setToken(data.token);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bhaifota_user', JSON.stringify(data.user));
        }
      }
      return data;
    },
  };

  users = {
    me: async () => {
      const user = await this.request<{ id: string; email: string; name: string; image?: string }>(
        '/users/me',
      );
      if (typeof window !== 'undefined' && user) {
        localStorage.setItem('bhaifota_user', JSON.stringify(user));
      }
      return user;
    },
  };

  rooms = {
    create: (body: { creatorRole: 'BROTHER' | 'SISTER'; invitedEmail: string }) =>
      this.request<{ room: { id: string; code: string }; inviteUrl?: string }>('/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    get: (id: string) => this.request<{ id: string; code: string; status: string }>(`/rooms/${id}`),
    state: (id: string) => this.request<any>(`/rooms/${id}/state`),
    mediaToken: (id: string) =>
      this.request<{ token: string; roomName: string }>(`/rooms/${id}/media-token`, {
        method: 'POST',
      }),
    end: (id: string) =>
      this.request(`/rooms/${id}/end`, { method: 'POST' }),
  };

  invitations = {
    accept: async (token: string) => {
      const data = await this.request<{ roomId: string; token?: string }>(
        `/invitations/${token}/accept`,
        { method: 'POST' },
      );
      if (data.token) {
        this.setToken(data.token);
      }
      return data;
    },
  };
}

export const api = new ApiClient();
