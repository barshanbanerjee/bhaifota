'use client';
import { DraggableObject } from './DraggableObject';
import { SiblingRole, RitualObject } from '@/types';

const RITUAL_PERMISSIONS = {
  BROTHER: {
    CHANDAN: ['RECEIVE'] as const,
    MISTI: ['OFFER', 'RECEIVE'] as const,
    DHAN_DURBA: ['OFFER', 'RECEIVE'] as const,
  },
  SISTER: {
    CHANDAN: ['APPLY'] as const,
    MISTI: ['OFFER', 'RECEIVE'] as const,
    DHAN_DURBA: ['OFFER', 'RECEIVE'] as const,
  },
} as const;

type InitiatableAction = 'APPLY' | 'OFFER';

function canInitiate(role: SiblingRole, object: RitualObject): boolean {
  const actions = (RITUAL_PERMISSIONS as any)[role]?.[object] ?? [];
  return actions.some((a: string) => a === 'APPLY' || a === 'OFFER');
}

interface RitualTrayProps {
  role: SiblingRole;
  targetParticipantId: string;
  roomId: string;
  onInteraction: (params: {
    object: RitualObject;
    action: InitiatableAction;
    targetParticipantId: string;
    position: { x: number; y: number };
  }) => void;
}

export function RitualTray({ role, targetParticipantId, onInteraction }: RitualTrayProps) {
  const objects: RitualObject[] = ['CHANDAN', 'MISTI', 'DHAN_DURBA'];

  return (
    <div className="flex items-center gap-6 px-6 py-4 bg-white/80 backdrop-blur rounded-2xl shadow-lg">
      <span className="text-xs font-semibold text-foreground/40 uppercase tracking-wider">
        Ritual Tray
      </span>
      <div className="flex gap-4">
        {objects.map((obj) => {
          const enabled = canInitiate(role, obj);
          const action: InitiatableAction =
            obj === 'CHANDAN' && role === 'SISTER' ? 'APPLY' : 'OFFER';

          return (
            <DraggableObject
              key={obj}
              object={obj}
              disabled={!enabled}
              onDrop={(x, y) => {
                if (!enabled) return;
                onInteraction({
                  object: obj,
                  action,
                  targetParticipantId,
                  position: { x, y },
                });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

