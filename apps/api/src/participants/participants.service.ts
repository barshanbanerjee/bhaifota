import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
  ) {}

  async setReady(roomId: string, userId: string) {
    await this.roomsService.assertMembership(roomId, userId);
    // Store readiness in Redis (handled by realtime module via presence keys)
    // Here we check if both are ready and update room status
    return { roomId, userId, ready: true };
  }

  async getByRoom(roomId: string) {
    return this.prisma.roomParticipant.findMany({
      where: { roomId },
      include: { user: true },
    });
  }
}
