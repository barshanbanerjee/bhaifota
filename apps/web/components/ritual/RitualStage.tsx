'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import { useRoomStore } from '@/stores/roomStore';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/lib/api/client';
import { connectSocket } from '@/lib/socket';
import { WaitingRoom } from '@/components/connection/WaitingRoom';
import { VideoGrid } from '@/components/media/VideoGrid';
import { RitualTray } from './RitualTray';
import { RitualOverlay } from './RitualOverlay';
import { MediaControls } from '@/components/media/MediaControls';
import { RitualObject } from '@/types';

interface RoomPageClientProps {
  code: string;
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RoomPageClient({ code }: RoomPageClientProps) {
  const router = useRouter();
  const { roomId, status, participants, pendingRestart } = useRoomStore();
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [livekitUrl] = useState(process.env.NEXT_PUBLIC_LIVEKIT_URL || '');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connect socket
  const socket = useSocket(roomId);

  useEffect(() => {
    // Load current user and room state
    const init = async () => {
      try {
        const user = await api.users.me();
        setCurrentUserId(user.id);
        connectSocket();
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchLiveKitToken = useCallback(async () => {
    if (!roomId) return;
    try {
      const { token } = await api.rooms.mediaToken(roomId);
      setLiveKitToken(token);
    } catch (err) {
      setError('Failed to get media token');
    }
  }, [roomId]);

  const handleReady = useCallback(async () => {
    setIsReady(true);
    await fetchLiveKitToken();
  }, [fetchLiveKitToken]);

  const myParticipant = participants.find((p) => p.userId === currentUserId);
  const otherParticipant = participants.find((p) => p.userId !== currentUserId);

  const handleInteraction = useCallback(
    (params: {
      object: RitualObject;
      action: 'APPLY' | 'OFFER';
      targetParticipantId: string;
      position: { x: number; y: number };
    }) => {
      if (!roomId || !socket) return;
      socket.emit('ritual:interaction:submit', {
        eventId: generateEventId(),
        roomId,
        ...params,
      });
    },
    [roomId, socket],
  );

  const handleRestartRequest = () => {
    if (!roomId || !socket) return;
    socket.emit('session:restart:request', { roomId });
  };

  const handleRestartConfirm = () => {
    if (!roomId || !socket) return;
    socket.emit('session:restart:confirm', { roomId });
  };

  const handleEndSession = () => {
    if (!roomId || !socket) return;
    socket.emit('session:end', { roomId });
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-foreground/40">Loading your room…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (status === 'COMPLETED' || status === 'EXPIRED') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl">🌸</div>
          <h2 className="text-2xl font-bold">Bhaifota complete</h2>
          <p className="text-foreground/60">The session has ended.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 rounded-xl bg-accent text-white font-bold"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isReady || !liveKitToken) {
    return (
      <WaitingRoom
        roomId={roomId ?? ''}
        code={code}
        onReady={handleReady}
      />
    );
  }

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={liveKitToken}
      connect={true}
      video={true}
      audio={true}
      className="h-screen flex flex-col bg-black"
    >
      {/* Restart confirmation banner */}
      {pendingRestart && pendingRestart.requestedBy !== currentUserId && (
        <div className="fixed inset-x-0 top-0 z-50 bg-yellow-400 text-black px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">Your sibling wants to restart — do you agree?</span>
          <div className="flex gap-3">
            <button
              onClick={handleRestartConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold"
            >
              Yes, restart
            </button>
            <button
              onClick={() => useRoomStore.getState().setPendingRestart(null)}
              className="px-4 py-2 bg-black/20 rounded-lg font-bold"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Video area */}
      <div className="flex-1 relative p-2">
        <VideoGrid
          onDropTarget={(participantId, x, y) => {
            const action = myParticipant?.role === 'SISTER' ? 'APPLY' : 'OFFER';
            handleInteraction({
              object: 'CHANDAN',
              action: action as 'APPLY' | 'OFFER',
              targetParticipantId: participantId,
              position: { x, y },
            });
          }}
        />
        <RitualOverlay />
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur">
        <MediaControls />

        {myParticipant && otherParticipant && (
          <RitualTray
            role={myParticipant.role}
            targetParticipantId={otherParticipant.userId}
            roomId={roomId ?? ''}
            onInteraction={handleInteraction}
          />
        )}

        <div className="flex gap-2">
          {pendingRestart?.requestedBy === currentUserId ? (
            <span className="text-sm text-yellow-400">Waiting for sibling to confirm…</span>
          ) : (
            <button
              onClick={handleRestartRequest}
              className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors"
            >
              Restart
            </button>
          )}
          <button
            onClick={handleEndSession}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            End session
          </button>
        </div>
      </div>
    </LiveKitRoom>
  );
}

