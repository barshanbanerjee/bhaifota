'use client';
import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useRoomStore } from '@/stores/roomStore';
import { RoomSnapshot, RitualInteractionAccepted, RoomStatus } from '@/types';

const SERVER_EVENTS = {
  ROOM_SNAPSHOT: 'room:snapshot',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  ROOM_STATUS: 'room:status',
  RITUAL_INTERACTION_ACCEPTED: 'ritual:interaction:accepted',
  RITUAL_INTERACTION_REJECTED: 'ritual:interaction:rejected',
  SESSION_RESTART_REQUESTED: 'session:restart:requested',
  SESSION_RESTARTED: 'session:restarted',
  SESSION_ENDED: 'session:ended',
  SYSTEM_ERROR: 'system:error',
};

export function useSocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { applySnapshot, addInteraction, clearInteractions, setStatus, setPendingRestart } =
    useRoomStore();

  useEffect(() => {
    if (!roomId) return;

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('room:join', { roomId });

    socket.on(SERVER_EVENTS.ROOM_SNAPSHOT, (snapshot: RoomSnapshot) => {
      applySnapshot(snapshot);
    });

    socket.on(SERVER_EVENTS.ROOM_STATUS, ({ status }: { status: RoomStatus }) => {
      setStatus(status);
    });

    socket.on(SERVER_EVENTS.RITUAL_INTERACTION_ACCEPTED, (interaction: RitualInteractionAccepted) => {
      addInteraction(interaction);
    });

    socket.on(SERVER_EVENTS.SESSION_RESTART_REQUESTED, (data: { requestedBy: string }) => {
      setPendingRestart(data);
    });

    socket.on(SERVER_EVENTS.SESSION_RESTARTED, () => {
      clearInteractions();
      setPendingRestart(null);
    });

    socket.on(SERVER_EVENTS.SESSION_ENDED, () => {
      setStatus('COMPLETED');
    });

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off(SERVER_EVENTS.ROOM_SNAPSHOT);
      socket.off(SERVER_EVENTS.ROOM_STATUS);
      socket.off(SERVER_EVENTS.RITUAL_INTERACTION_ACCEPTED);
      socket.off(SERVER_EVENTS.SESSION_RESTART_REQUESTED);
      socket.off(SERVER_EVENTS.SESSION_RESTARTED);
      socket.off(SERVER_EVENTS.SESSION_ENDED);
    };
  }, [roomId, applySnapshot, addInteraction, clearInteractions, setStatus, setPendingRestart]);

  return socketRef.current ?? getSocket();
}

