// ---- Enums ----
export type SiblingRole = 'BROTHER' | 'SISTER';
export type RoomStatus = 'WAITING' | 'CONNECTED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export type RitualObject = 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
export type RitualAction = 'APPLY' | 'OFFER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';

// ---- Ritual permissions ----
export const RITUAL_PERMISSIONS = {
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

// ---- Room code alphabet ----
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// ---- Socket.IO events ----
export const CLIENT_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  PARTICIPANT_READY: 'participant:ready',
  RITUAL_INTERACTION_SUBMIT: 'ritual:interaction:submit',
  SESSION_RESTART_REQUEST: 'session:restart:request',
  SESSION_RESTART_CONFIRM: 'session:restart:confirm',
  SESSION_END: 'session:end',
  CLIENT_SYNC: 'client:sync',
} as const;

export const SERVER_EVENTS = {
  ROOM_SNAPSHOT: 'room:snapshot',
  PARTICIPANT_JOINED: 'participant:joined',
  PARTICIPANT_LEFT: 'participant:left',
  PARTICIPANT_RECONNECTED: 'participant:reconnected',
  ROOM_STATUS: 'room:status',
  RITUAL_INTERACTION_ACCEPTED: 'ritual:interaction:accepted',
  RITUAL_INTERACTION_REJECTED: 'ritual:interaction:rejected',
  SESSION_RESTART_REQUESTED: 'session:restart:requested',
  SESSION_RESTARTED: 'session:restarted',
  SESSION_ENDED: 'session:ended',
  SYSTEM_ERROR: 'system:error',
} as const;

// ---- Event envelope ----
export interface RealtimeEvent<T = unknown> {
  eventId: string;
  type: string;
  roomId: string;
  payload: T;
  clientTimestamp: number;
}

// ---- Interaction event shapes ----
export interface RitualInteractionSubmitted {
  eventId: string;
  roomId: string;
  object: RitualObject;
  action: 'APPLY' | 'OFFER';
  targetParticipantId: string;
  position: {
    x: number; // 0 to 1
    y: number; // 0 to 1
  };
}

export interface RitualInteractionAccepted extends RitualInteractionSubmitted {
  sequence: number;
  senderId: string;
  serverTimestamp: number;
}

// ---- Room snapshot ----
export interface ParticipantSnapshot {
  userId: string;
  role: SiblingRole;
  name: string;
  image?: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface RoomSnapshot {
  roomId: string;
  code: string;
  status: RoomStatus;
  revision: number;
  participants: ParticipantSnapshot[];
  interactions: RitualInteractionAccepted[];
}
