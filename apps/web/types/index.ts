export type SiblingRole = 'BROTHER' | 'SISTER';
export type RoomStatus = 'WAITING' | 'CONNECTED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export type RitualObject = 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
export type RitualAction = 'APPLY' | 'OFFER' | 'RECEIVE';

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
}

export interface ParticipantSnapshot {
  userId: string;
  role: SiblingRole;
  name: string;
  image?: string;
  isReady: boolean;
  isConnected: boolean;
}

export interface RitualInteractionAccepted {
  eventId: string;
  roomId: string;
  object: RitualObject;
  action: 'APPLY' | 'OFFER';
  targetParticipantId: string;
  position: { x: number; y: number };
  sequence: number;
  senderId: string;
  serverTimestamp: number;
}

export interface RoomSnapshot {
  roomId: string;
  code: string;
  status: RoomStatus;
  revision: number;
  participants: ParticipantSnapshot[];
  interactions: RitualInteractionAccepted[];
}

