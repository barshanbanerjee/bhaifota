"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVER_EVENTS = exports.CLIENT_EVENTS = exports.ROOM_ALPHABET = exports.RITUAL_PERMISSIONS = void 0;
// ---- Ritual permissions ----
exports.RITUAL_PERMISSIONS = {
    BROTHER: {
        CHANDAN: ['RECEIVE'],
        MISTI: ['OFFER', 'RECEIVE'],
        DHAN_DURBA: ['OFFER', 'RECEIVE'],
    },
    SISTER: {
        CHANDAN: ['APPLY'],
        MISTI: ['OFFER', 'RECEIVE'],
        DHAN_DURBA: ['OFFER', 'RECEIVE'],
    },
};
// ---- Room code alphabet ----
exports.ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// ---- Socket.IO events ----
exports.CLIENT_EVENTS = {
    ROOM_JOIN: 'room:join',
    ROOM_LEAVE: 'room:leave',
    PARTICIPANT_READY: 'participant:ready',
    RITUAL_INTERACTION_SUBMIT: 'ritual:interaction:submit',
    SESSION_RESTART_REQUEST: 'session:restart:request',
    SESSION_RESTART_CONFIRM: 'session:restart:confirm',
    SESSION_END: 'session:end',
    CLIENT_SYNC: 'client:sync',
};
exports.SERVER_EVENTS = {
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
};
//# sourceMappingURL=types.js.map