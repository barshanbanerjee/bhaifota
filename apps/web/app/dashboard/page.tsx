'use client';
import { CreateRoomForm } from '@/components/invitation/InvitationCard';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';

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
            <UserAvatar image={user.image} name={user.name} size="sm" />
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
