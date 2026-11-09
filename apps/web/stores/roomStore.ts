import { create } from 'zustand';
import { RoomSnapshot, RitualInteractionAccepted, RoomStatus, ParticipantSnapshot } from '@/types';

interface RoomState {
  roomId: string | null;
  code: string | null;
  status: RoomStatus | null;
  revision: number;
  participants: ParticipantSnapshot[];
  interactions: RitualInteractionAccepted[];
  pendingRestart: { requestedBy: string } | null;

  // Actions
  applySnapshot: (snapshot: RoomSnapshot) => void;
  addInteraction: (interaction: RitualInteractionAccepted) => void;
  clearInteractions: () => void;
  setStatus: (status: RoomStatus) => void;
  setPendingRestart: (data: { requestedBy: string } | null) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  code: null,
  status: null,
  revision: 0,
  participants: [],
  interactions: [],
  pendingRestart: null,

  applySnapshot: (snapshot) =>
    set({
      roomId: snapshot.roomId,
      code: snapshot.code,
      status: snapshot.status,
      revision: snapshot.revision,
      participants: snapshot.participants,
      interactions: snapshot.interactions,
    }),

  addInteraction: (interaction) =>
    set((state) => {
      // Idempotency: skip if already in list
      const exists = state.interactions.some((i) => i.eventId === interaction.eventId);
      if (exists) return state;
      return {
        interactions: [...state.interactions, interaction].sort((a, b) => a.sequence - b.sequence),
        revision: state.revision + 1,
      };
    }),

  clearInteractions: () => set({ interactions: [], pendingRestart: null }),

  setStatus: (status) => set({ status }),

  setPendingRestart: (data) => set({ pendingRestart: data }),

  reset: () =>
    set({
      roomId: null,
      code: null,
      status: null,
      revision: 0,
      participants: [],
      interactions: [],
      pendingRestart: null,
    }),
}));

