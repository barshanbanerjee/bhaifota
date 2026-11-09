export type SiblingRole = 'BROTHER' | 'SISTER';
export type RoomStatus = 'WAITING' | 'CONNECTED' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export type RitualObject = 'CHANDAN' | 'MISTI' | 'DHAN_DURBA';
export type RitualAction = 'APPLY' | 'OFFER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
export declare const RITUAL_PERMISSIONS: {
    readonly BROTHER: {
        readonly CHANDAN: readonly ["RECEIVE"];
        readonly MISTI: readonly ["OFFER", "RECEIVE"];
        readonly DHAN_DURBA: readonly ["OFFER", "RECEIVE"];
    };
    readonly SISTER: {
        readonly CHANDAN: readonly ["APPLY"];
        readonly MISTI: readonly ["OFFER", "RECEIVE"];
        readonly DHAN_DURBA: readonly ["OFFER", "RECEIVE"];
    };
};
export declare const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export declare const CLIENT_EVENTS: {
    readonly ROOM_JOIN: "room:join";
    readonly ROOM_LEAVE: "room:leave";
    readonly PARTICIPANT_READY: "participant:ready";
    readonly RITUAL_INTERACTION_SUBMIT: "ritual:interaction:submit";
    readonly SESSION_RESTART_REQUEST: "session:restart:request";
    readonly SESSION_RESTART_CONFIRM: "session:restart:confirm";
    readonly SESSION_END: "session:end";
    readonly CLIENT_SYNC: "client:sync";
};
export declare const SERVER_EVENTS: {
    readonly ROOM_SNAPSHOT: "room:snapshot";
    readonly PARTICIPANT_JOINED: "participant:joined";
    readonly PARTICIPANT_LEFT: "participant:left";
    readonly PARTICIPANT_RECONNECTED: "participant:reconnected";
    readonly ROOM_STATUS: "room:status";
    readonly RITUAL_INTERACTION_ACCEPTED: "ritual:interaction:accepted";
    readonly RITUAL_INTERACTION_REJECTED: "ritual:interaction:rejected";
    readonly SESSION_RESTART_REQUESTED: "session:restart:requested";
    readonly SESSION_RESTARTED: "session:restarted";
    readonly SESSION_ENDED: "session:ended";
    readonly SYSTEM_ERROR: "system:error";
};
export interface RealtimeEvent<T = unknown> {
    eventId: string;
    type: string;
    roomId: string;
    payload: T;
    clientTimestamp: number;
}
export interface RitualInteractionSubmitted {
    eventId: string;
    roomId: string;
    object: RitualObject;
    action: 'APPLY' | 'OFFER';
    targetParticipantId: string;
    position: {
        x: number;
        y: number;
    };
}
export interface RitualInteractionAccepted extends RitualInteractionSubmitted {
    sequence: number;
    senderId: string;
    serverTimestamp: number;
}
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
//# sourceMappingURL=types.d.ts.map