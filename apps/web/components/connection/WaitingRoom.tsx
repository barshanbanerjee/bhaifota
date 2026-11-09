'use client';
import { useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';

interface WaitingRoomProps {
  roomId: string;
  code: string;
  onReady: () => void;
}

export function WaitingRoom({ roomId, code, onReady }: WaitingRoomProps) {
  const participants = useRoomStore((s) => s.participants);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const requestPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionsGranted(true);
    } catch (err) {
      setPermissionError('Camera and microphone access is required. Please allow access and try again.');
    }
  };

  const handleReady = () => {
    onReady();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-sm w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-accent mb-2">ভাইফোঁটা</h1>
          <p className="text-foreground/60">Room code: <span className="font-mono font-bold">{code}</span></p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <h2 className="font-semibold text-lg">Waiting for your sibling…</h2>
          <div className="space-y-2">
            {participants.map((p) => (
              <div key={p.userId} className="flex items-center gap-3 p-3 rounded-xl bg-background">
                {p.image && (
                  <img src={p.image} alt={p.name} className="w-8 h-8 rounded-full" />
                )}
                <span className="font-medium">{p.name}</span>
                <span className="ml-auto text-sm text-foreground/50">
                  {p.role === 'SISTER' ? '👧 Bon' : '👦 Bhai'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {!permissionsGranted ? (
          <div className="space-y-3">
            <p className="text-sm text-foreground/60">
              We need access to your camera and microphone to connect with your sibling.
            </p>
            {permissionError && <p className="text-red-500 text-sm">{permissionError}</p>}
            <button
              onClick={requestPermissions}
              className="w-full py-3 rounded-xl bg-accent text-white font-bold hover:bg-pink-700 transition-colors"
            >
              Allow camera & microphone
            </button>
          </div>
        ) : (
          <button
            onClick={handleReady}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-colors"
          >
            I'm ready ✓
          </button>
        )}
      </div>
    </div>
  );
}

