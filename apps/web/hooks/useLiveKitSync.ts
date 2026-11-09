'use client';
import { useEffect, useCallback } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { RoomEvent, RemoteParticipant } from 'livekit-client';
import { useRoomStore } from '@/stores/roomStore';
import { RitualInteractionAccepted, RitualObject } from '@/types';
import { api } from '@/lib/api/client';

export type LiveKitSyncMessage =
  | { type: 'RITUAL_INTERACTION'; interaction: RitualInteractionAccepted }
  | { type: 'SESSION_RESTART_REQUEST'; requestedBy: string }
  | { type: 'SESSION_RESTART_CONFIRM' }
  | { type: 'SESSION_END' }
  | { type: 'ROOM_SNAPSHOT'; interactions: RitualInteractionAccepted[] };

export function useLiveKitSync(roomId: string | null) {
  const room = useRoomContext();
  const {
    addInteraction,
    clearInteractions,
    setStatus,
    setPendingRestart,
  } = useRoomStore();

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data: LiveKitSyncMessage = JSON.parse(text);

        switch (data.type) {
          case 'RITUAL_INTERACTION':
            addInteraction(data.interaction);
            break;
          case 'SESSION_RESTART_REQUEST':
            setPendingRestart({ requestedBy: data.requestedBy });
            break;
          case 'SESSION_RESTART_CONFIRM':
            clearInteractions();
            setPendingRestart(null);
            break;
          case 'SESSION_END':
            setStatus('COMPLETED');
            break;
          case 'ROOM_SNAPSHOT':
            if (data.interactions && Array.isArray(data.interactions)) {
              data.interactions.forEach((i) => addInteraction(i));
            }
            break;
        }
      } catch (err) {
        console.error('[LiveKitSync] Error handling data packet:', err);
      }
    };

    // When sibling connects, send our interactions so they are immediately synchronized
    const handleParticipantConnected = () => {
      const currentInteractions = useRoomStore.getState().interactions;
      if (currentInteractions.length > 0) {
        try {
          const snapshotMsg: LiveKitSyncMessage = {
            type: 'ROOM_SNAPSHOT',
            interactions: currentInteractions,
          };
          const encoded = new TextEncoder().encode(JSON.stringify(snapshotMsg));
          room.localParticipant.publishData(encoded, { reliable: true });
        } catch (err) {
          console.error('[LiveKitSync] Failed to publish snapshot to new participant:', err);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
    };
  }, [room, addInteraction, clearInteractions, setStatus, setPendingRestart]);

  const sendInteraction = useCallback(
    async (params: {
      object: RitualObject;
      action: 'APPLY' | 'OFFER';
      targetParticipantId: string;
      position: { x: number; y: number };
    }) => {
      if (!room || !roomId) return;

      const interaction: RitualInteractionAccepted = {
        eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        roomId,
        object: params.object,
        action: params.action,
        targetParticipantId: params.targetParticipantId,
        position: params.position,
        sequence: Date.now(),
        senderId: room.localParticipant.identity,
        serverTimestamp: Date.now(),
      };

      // 1. Optimistically apply locally
      addInteraction(interaction);

      // 2. Transmit to sibling over WebRTC reliable data channel
      try {
        const msg: LiveKitSyncMessage = {
          type: 'RITUAL_INTERACTION',
          interaction,
        };
        const encoded = new TextEncoder().encode(JSON.stringify(msg));
        await room.localParticipant.publishData(encoded, { reliable: true });
      } catch (err) {
        console.error('[LiveKitSync] Failed to publish interaction:', err);
      }
    },
    [room, roomId, addInteraction]
  );

  const requestRestart = useCallback(async () => {
    if (!room) return;
    const myId = room.localParticipant.identity;
    setPendingRestart({ requestedBy: myId });

    try {
      const msg: LiveKitSyncMessage = {
        type: 'SESSION_RESTART_REQUEST',
        requestedBy: myId,
      };
      const encoded = new TextEncoder().encode(JSON.stringify(msg));
      await room.localParticipant.publishData(encoded, { reliable: true });
    } catch (err) {
      console.error('[LiveKitSync] Failed to publish restart request:', err);
    }
  }, [room, setPendingRestart]);

  const confirmRestart = useCallback(async () => {
    if (!room) return;
    clearInteractions();
    setPendingRestart(null);

    try {
      const msg: LiveKitSyncMessage = {
        type: 'SESSION_RESTART_CONFIRM',
      };
      const encoded = new TextEncoder().encode(JSON.stringify(msg));
      await room.localParticipant.publishData(encoded, { reliable: true });
    } catch (err) {
      console.error('[LiveKitSync] Failed to publish restart confirm:', err);
    }
  }, [room, clearInteractions, setPendingRestart]);

  const endSession = useCallback(async () => {
    if (!room || !roomId) return;
    setStatus('COMPLETED');

    try {
      const msg: LiveKitSyncMessage = {
        type: 'SESSION_END',
      };
      const encoded = new TextEncoder().encode(JSON.stringify(msg));
      await room.localParticipant.publishData(encoded, { reliable: true });
    } catch (err) {
      console.error('[LiveKitSync] Failed to publish session end:', err);
    }

    try {
      await api.rooms.end(roomId);
    } catch (err) {
      console.error('[LiveKitSync] Failed to update room status via API:', err);
    }
  }, [room, roomId, setStatus]);

  return {
    sendInteraction,
    requestRestart,
    confirmRestart,
    endSession,
  };
}

