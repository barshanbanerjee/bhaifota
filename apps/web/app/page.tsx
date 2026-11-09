'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from '@/components/ui/UserAvatar';

export default function MarketingPage() {
  const { user, isAuthenticated, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-black/10">
        <span className="text-2xl font-bold text-accent">ভাইফোঁটা</span>
        {!loading && (
          <div>
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white font-semibold text-sm hover:bg-pink-700 transition-colors shadow-sm"
              >
                <UserAvatar image={user?.image} name={user?.name} size="xs" />
                <span>Dashboard →</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 rounded-full bg-accent text-white font-semibold text-sm hover:bg-pink-700 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
            Celebrate <span className="text-accent">ভাইফোঁটা</span>
            <br />
            together — wherever you are.
          </h1>
          <p className="text-xl text-foreground/60 mb-10 leading-relaxed">
            A private, intimate space for siblings to share the ritual of Bhaifota
            through live video, with synchronized virtual offerings — just between the two of you.
          </p>
          <Link
            href={isAuthenticated ? '/dashboard' : '/login'}
            className="inline-block px-8 py-4 rounded-full bg-accent text-white font-bold text-lg hover:bg-pink-700 transition-colors shadow-lg"
          >
            {isAuthenticated ? 'Go to your dashboard →' : 'Start celebrating →'}
          </Link>
        </div>
      </main>

      {/* Ritual objects preview */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { emoji: '🌸', name: 'চন্দন', desc: 'Chandan' },
            { emoji: '🍬', name: 'মিষ্টি', desc: 'Mishti' },
            { emoji: '🌿', name: 'ধান দুর্বা', desc: 'Dhan Durba' },
          ].map((obj) => (
            <div key={obj.name} className="p-6 rounded-2xl bg-white shadow-sm">
              <div className="text-5xl mb-3">{obj.emoji}</div>
              <div className="font-bold text-lg">{obj.name}</div>
              <div className="text-sm text-foreground/50">{obj.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-8 text-sm text-foreground/40">
        Made with love for siblings far apart.
      </footer>
    </div>
  );
}
