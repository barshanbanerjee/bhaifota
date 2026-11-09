'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

export function CreateRoomForm() {
  const router = useRouter();
  const [role, setRole] = useState<'BROTHER' | 'SISTER'>('SISTER');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{ code: string; inviteUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.rooms.create({
        creatorRole: role,
        invitedEmail: email,
      });
      setCreatedRoom({ code: data.room.code, inviteUrl: data.inviteUrl });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (createdRoom?.inviteUrl) {
      navigator.clipboard.writeText(createdRoom.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdRoom) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-5">
        <div className="text-5xl">✉️</div>
        <div>
          <h2 className="text-xl font-bold text-accent">Room Created!</h2>
          <p className="text-sm text-foreground/70 mt-1">
            Invitation email dispatched to <strong>{email}</strong>
          </p>
        </div>

        {createdRoom.inviteUrl && (
          <div className="bg-background rounded-xl p-3 text-left space-y-2 border border-black/5">
            <span className="text-xs font-semibold text-foreground/50 uppercase tracking-wider block">
              Direct Invite Link
            </span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={createdRoom.inviteUrl}
                className="text-xs bg-white px-3 py-2 rounded-lg border border-black/10 flex-1 truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded-lg bg-black/5 hover:bg-black/10 text-xs font-semibold whitespace-nowrap transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push(`/room/${createdRoom.code}`)}
          className="w-full py-3 rounded-xl bg-accent text-white font-bold text-lg hover:bg-pink-700 transition-colors shadow-md"
        >
          Enter Room →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
      <div>
        <label className="block text-sm font-semibold mb-2">I am the</label>
        <div className="grid grid-cols-2 gap-3">
          {(['SISTER', 'BROTHER'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                role === r
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-black/10 text-foreground/50 hover:border-black/30'
              }`}
            >
              {r === 'SISTER' ? '👧 Bon / Didi' : '👦 Bhai / Dada'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-semibold mb-2">
          {role === 'SISTER' ? "Brother's" : "Sister's"} email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={`${role === 'SISTER' ? 'brother' : 'sister'}@example.com`}
          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading || !email}
        className="w-full py-3 rounded-xl bg-accent text-white font-bold text-lg disabled:opacity-50 hover:bg-pink-700 transition-colors"
      >
        {loading ? 'Creating room...' : 'Create room & send invitation →'}
      </button>
    </form>
  );
}

export function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);
    try {
      const { roomId } = await api.invitations.accept(token);
      const room = await api.rooms.get(roomId);
      router.push(`/room/${room.code}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-6">
        <div className="text-5xl">🌸</div>
        <div>
          <h1 className="text-2xl font-bold text-accent mb-2">ভাইফোঁটা</h1>
          <p className="text-foreground/60">
            You've been invited to celebrate Bhaifota together.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        {authLoading ? (
          <div className="text-sm text-foreground/40 py-4">Checking session…</div>
        ) : user ? (
          <div className="space-y-4">
            <div className="bg-background rounded-xl p-3 flex items-center gap-3 text-left">
              {user.image && (
                <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full" />
              )}
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-foreground/50">Signed in as</div>
                <div className="text-sm font-medium truncate">{user.name} ({user.email})</div>
              </div>
            </div>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-accent text-white font-bold text-lg disabled:opacity-50 hover:bg-pink-700 transition-colors"
            >
              {loading ? 'Joining...' : 'Accept & Join →'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-foreground/70">
              Please sign in with Google using the invited email to join.
            </p>
            <GoogleSignInButton onSuccess={handleAccept} />
          </div>
        )}
      </div>
    </div>
  );
}

