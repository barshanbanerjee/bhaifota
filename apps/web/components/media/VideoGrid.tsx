'use client';
import { VideoTrack, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';

interface VideoGridProps {
  onDropTarget?: (participantId: string, x: number, y: number) => void;
}

export function VideoGrid({ onDropTarget }: VideoGridProps) {
  const tracks = useTracks([Track.Source.Camera]);
  const localTrack = tracks.find((t) => t.participant.isLocal);
  const remoteTracks = tracks.filter((t) => !t.participant.isLocal);

  return (
    <div className="grid grid-cols-2 gap-2 w-full h-full">
      {/* Local video */}
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
        {localTrack ? (
          <VideoTrack trackRef={localTrack} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
            Camera starting...
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          You
        </div>
      </div>

      {/* Remote video */}
      {remoteTracks.length > 0 ? (
        remoteTracks.map((track) => (
          <div
            key={track.participant.identity}
            data-drop-target="true"
            className="relative rounded-xl overflow-hidden bg-black aspect-video"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              onDropTarget?.(track.participant.identity, x, y);
            }}
          >
            <VideoTrack trackRef={track} className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
              Sibling
            </div>
          </div>
        ))
      ) : (
        <div
          data-drop-target="true"
          className="relative rounded-xl overflow-hidden bg-zinc-900 aspect-video flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-white/10"
        >
          <div className="text-3xl mb-2">🌸</div>
          <div className="text-white/60 text-sm font-medium">Waiting for your sibling to connect camera...</div>
        </div>
      )}
    </div>
  );
}
