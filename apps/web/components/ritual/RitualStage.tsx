'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LiveKitRoom } from '@livekit/components-react';
import { useRoomStore } from '@/stores/roomStore';
import { useLiveKitSync } from '@/hooks/useLiveKitSync';
import { api } from '@/lib/api/client';
import { WaitingRoom } from '@/components/connection/WaitingRoom';
import { VideoGrid } from '@/components/media/VideoGrid';
import { RitualTray } from './RitualTray';
import { RitualOverlay } from './RitualOverlay';
import { MediaControls } from '@/components/media/MediaControls';
import { RitualObject } from '@/types';

interface RoomPageClientProps {
  code: string;
}

function RitualStageRoom({
  roomId,
  currentUserId,
}: {
  roomId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const { participants, pendingRestart } = useRoomStore();
  const { sendInteraction, requestRestart, confirmRestart, endSession } =
    useLiveKitSync(roomId);

  const myParticipant = participants.find((p) => p.userId === currentUserId);
  const otherParticipant = participants.find((p) => p.userId !== currentUserId);

  const handleInteraction = useCallback(
    (params: {
      object: RitualObject;
      action: 'APPLY' | 'OFFER';
      targetParticipantId: string;
      position: { x: number; y: number };
    }) => {
      sendInteraction(params);
    },
    [sendInteraction]
  );

  const handleEndSession = async () => {
    await endSession();
    router.push('/dashboard');
  };

  return (
    <>
      {/* Restart confirmation banner */}
      {pendingRestart && pendingRestart.requestedBy !== currentUserId && (
        <div className="fixed inset-x-0 top-0 z-50 bg-yellow-400 text-black px-6 py-4 flex items-center justify-between shadow-md">
          <span className="font-semibold">Your sibling wants to restart — do you agree?</span>
          <div className="flex gap-3">
            <button
              onClick={confirmRestart}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
            >
              Yes, restart
            </button>
            <button
              onClick={() => useRoomStore.getState().setPendingRestart(null)}
              className="px-4 py-2 bg-black/20 rounded-lg font-bold hover:bg-black/30 transition-colors"
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
            roomId={roomId}
            onInteraction={handleInteraction}
          />
        )}

        <div className="flex gap-2">
          {pendingRestart?.requestedBy === currentUserId ? (
            <span className="text-sm text-yellow-400 self-center">Waiting for sibling to confirm…</span>
          ) : (
            <button
              onClick={requestRestart}
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
    </>
  );
}

export function RoomPageClient({ code }: RoomPageClientProps) {
  const router = useRouter();
  const { roomId, status } = useRoomStore();
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [livekitUrl] = useState(process.env.NEXT_PUBLIC_LIVEKIT_URL || '');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load current user and room state
    const init = async () => {
      try {
        const user = await api.users.me();
        setCurrentUserId(user.id);

        const roomData = await api.rooms.get(code);
        useRoomStore.getState().applySnapshot({
          roomId: roomData.id,
          code: roomData.code,
          status: roomData.status as any,
          revision: 1,
          participants: (roomData as any).participants || [],
          interactions: [],
        });
      } catch (err) {
        console.error('Room init failed:', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [code, router]);

  const fetchLiveKitToken = useCallback(async (activeRoomId: string) => {
    try {
      const { token } = await api.rooms.mediaToken(activeRoomId);
      setLiveKitToken(token);
    } catch (err) {
      setError('Failed to get media token');
    }
  }, []);

  const handleReady = useCallback(async () => {
    const activeRoomId = useRoomStore.getState().roomId || roomId;
    if (!activeRoomId) return;
    setIsReady(true);
    await fetchLiveKitToken(activeRoomId);
  }, [roomId, fetchLiveKitToken]);

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
            className="px-6 py-3 rounded-xl bg-accent text-white font-bold hover:bg-pink-700 transition-colors"
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
      <RitualStageRoom roomId={roomId ?? ''} currentUserId={currentUserId ?? ''} />
    </LiveKitRoom>
  );
}
