'use client';
import { useState, useEffect } from 'react';
import { useLocalParticipant } from '@livekit/components-react';

export function MediaControls() {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [micEnabled, setMicEnabled] = useState(isMicrophoneEnabled);
  const [cameraEnabled, setCameraEnabled] = useState(isCameraEnabled);

  useEffect(() => {
    setMicEnabled(isMicrophoneEnabled);
  }, [isMicrophoneEnabled]);

  useEffect(() => {
    setCameraEnabled(isCameraEnabled);
  }, [isCameraEnabled]);

  const toggleMic = async () => {
    const nextState = !micEnabled;
    await localParticipant?.setMicrophoneEnabled(nextState);
    setMicEnabled(nextState);
  };

  const toggleCamera = async () => {
    const nextState = !cameraEnabled;
    await localParticipant?.setCameraEnabled(nextState);
    setCameraEnabled(nextState);
  };

  return (
    <div className="flex gap-3 items-center">
      <button
        onClick={toggleMic}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          !micEnabled ? 'bg-red-500 text-white' : 'bg-white/80 text-foreground'
        }`}
        title={!micEnabled ? 'Unmute' : 'Mute'}
      >
        {!micEnabled ? '🔇' : '🎙️'}
      </button>
      <button
        onClick={toggleCamera}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          !cameraEnabled ? 'bg-red-500 text-white' : 'bg-white/80 text-foreground'
        }`}
        title={!cameraEnabled ? 'Turn on camera' : 'Turn off camera'}
      >
        {!cameraEnabled ? '🚫' : '📹'}
      </button>
    </div>
  );
}
