'use client';
import { CreateRoomForm } from '@/components/invitation/InvitationCard';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user, loading, logout } = useAuth({ requireAuth: true });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/50">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/10 bg-white/50 backdrop-blur">
        <span className="text-2xl font-bold text-accent">ভাইফোঁটা</span>
        {user && (
          <div className="flex items-center gap-3">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-black/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="text-xs text-foreground/50 hover:text-red-600 transition-colors px-2 py-1 rounded"
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2 text-center">Create a Room</h1>
          <p className="text-foreground/60 text-center mb-8">
            Invite your sibling to celebrate Bhaifota together.
          </p>
          <CreateRoomForm />
        </div>
      </main>
    </div>
  );
}
