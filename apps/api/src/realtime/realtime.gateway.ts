import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RoomsService } from '../rooms/rooms.service';
import { RitualService } from '../ritual/ritual.service';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  RitualInteractionSubmitted,
  RoomSnapshot,
} from '@bhaifota/shared';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map: socketId → { userId, roomId }
  private socketMeta = new Map<string, { userId: string; roomId?: string }>();
  // Map: roomId → Set<socketId> for restart confirmation tracking
  private pendingRestarts = new Map<string, { requesterId: string; confirmerSocketId?: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
    private readonly ritualService: RitualService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract JWT from cookie or auth header
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.cookie
          ?.split(';')
          .find((c) => c.trim().startsWith('bhaifota_session='))
          ?.split('=')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; email: string }>(token);
      (client as AuthenticatedSocket).userId = payload.sub;
      (client as AuthenticatedSocket).userEmail = payload.email;
      this.socketMeta.set(client.id, { userId: payload.sub });
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const meta = this.socketMeta.get(client.id);
    if (meta?.roomId) {
      this.server.to(meta.roomId).emit(SERVER_EVENTS.PARTICIPANT_LEFT, {
        userId: meta.userId,
      });
    }
    this.socketMeta.delete(client.id);
  }

  @SubscribeMessage(CLIENT_EVENTS.ROOM_JOIN)
  async onRoomJoin(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; lastRevision?: number },
  ) {
    try {
      await this.roomsService.assertMembership(data.roomId, client.userId);
      await client.join(data.roomId);

      const meta = this.socketMeta.get(client.id);
      if (meta) meta.roomId = data.roomId;

      // Notify others
      this.server.to(data.roomId).except(client.id).emit(SERVER_EVENTS.PARTICIPANT_JOINED, {
        userId: client.userId,
      });

      // Send snapshot
      const snapshot = await this.buildSnapshot(data.roomId);
      client.emit(SERVER_EVENTS.ROOM_SNAPSHOT, snapshot);
    } catch (err) {
      client.emit(SERVER_EVENTS.SYSTEM_ERROR, { message: (err as Error).message });
    }
  }

  @SubscribeMessage(CLIENT_EVENTS.PARTICIPANT_READY)
  async onParticipantReady(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    // Check if both participants are ready → set room ACTIVE
    const socketsInRoom = await this.server.in(data.roomId).fetchSockets();

    if (socketsInRoom.length >= 2) {
      await this.roomsService.updateStatus(data.roomId, 'ACTIVE');
      this.server.to(data.roomId).emit(SERVER_EVENTS.ROOM_STATUS, { status: 'ACTIVE' });
    }
  }

  @SubscribeMessage(CLIENT_EVENTS.RITUAL_INTERACTION_SUBMIT)
  async onRitualInteraction(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() event: RitualInteractionSubmitted,
  ) {
    try {
      const { duplicate, interaction } = await this.ritualService.validateAndPersist(
        event,
        client.userId,
      );

      if (duplicate) {
        client.emit(SERVER_EVENTS.RITUAL_INTERACTION_REJECTED, {
          eventId: event.eventId,
          reason: 'duplicate',
        });
        return;
      }

      this.server.to(event.roomId).emit(SERVER_EVENTS.RITUAL_INTERACTION_ACCEPTED, {
        ...event,
        senderId: client.userId,
        sequence: interaction.sequence,
        serverTimestamp: Date.now(),
      });
    } catch (err) {
      client.emit(SERVER_EVENTS.RITUAL_INTERACTION_REJECTED, {
        eventId: event.eventId,
        reason: (err as Error).message,
      });
    }
  }

  @SubscribeMessage(CLIENT_EVENTS.SESSION_RESTART_REQUEST)
  async onRestartRequest(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    this.pendingRestarts.set(data.roomId, { requesterId: client.userId });
    this.server.to(data.roomId).except(client.id).emit(SERVER_EVENTS.SESSION_RESTART_REQUESTED, {
      requestedBy: client.userId,
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.SESSION_RESTART_CONFIRM)
  async onRestartConfirm(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const pending = this.pendingRestarts.get(data.roomId);
    if (!pending || pending.requesterId === client.userId) {
      client.emit(SERVER_EVENTS.SYSTEM_ERROR, { message: 'No pending restart to confirm' });
      return;
    }

    // Both confirmed — perform restart
    await this.ritualService.clearInteractions(data.roomId);
    this.pendingRestarts.delete(data.roomId);
    this.server.to(data.roomId).emit(SERVER_EVENTS.SESSION_RESTARTED, {
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.SESSION_END)
  async onSessionEnd(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    await this.roomsService.assertMembership(data.roomId, client.userId);
    await this.roomsService.updateStatus(data.roomId, 'COMPLETED');
    this.server.to(data.roomId).emit(SERVER_EVENTS.SESSION_ENDED, {
      endedBy: client.userId,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage(CLIENT_EVENTS.CLIENT_SYNC)
  async onClientSync(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const snapshot = await this.buildSnapshot(data.roomId);
    client.emit(SERVER_EVENTS.ROOM_SNAPSHOT, snapshot);
  }

  private async buildSnapshot(roomId: string): Promise<RoomSnapshot> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: { include: { user: true } } },
    });
    const interactions = await this.prisma.ritualInteraction.findMany({
      where: { roomId },
      orderBy: { sequence: 'asc' },
    });

    return {
      roomId,
      code: room!.code,
      status: room!.status as any,
      revision: room!.revision,
      participants: room!.participants.map((p) => ({
        userId: p.userId,
        role: p.role as any,
        name: p.user.name,
        image: p.user.image ?? undefined,
        isReady: true,
        isConnected: true,
      })),
      interactions: interactions.map((i) => ({
        eventId: i.eventId,
        roomId,
        object: i.object as any,
        action: i.action as any,
        targetParticipantId: i.targetId,
        position: { x: i.positionX, y: i.positionY },
        sequence: i.sequence,
        senderId: i.senderId,
        serverTimestamp: i.createdAt.getTime(),
      })),
    };
  }
}
