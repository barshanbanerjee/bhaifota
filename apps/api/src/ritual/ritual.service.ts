import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RITUAL_PERMISSIONS, RitualInteractionSubmitted } from '@bhaifota/shared';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class RitualService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
  ) {}

  async validateAndPersist(
    event: RitualInteractionSubmitted,
    senderId: string,
  ) {
    // 1. Assert membership and get role
    const participant = await this.roomsService.assertMembership(event.roomId, senderId);

    // 2. Check room status
    const room = await this.prisma.room.findUnique({ where: { id: event.roomId } });
    if (!room || room.status !== 'ACTIVE') {
      throw new ForbiddenException('Room is not active');
    }

    // 3. Check ritual permission
    const role = participant.role; // BROTHER | SISTER
    const allowedActions = (RITUAL_PERMISSIONS as any)[role]?.[event.object] ?? [];
    if (!allowedActions.includes(event.action)) {
      throw new ForbiddenException(
        `${role} cannot perform ${event.action} on ${event.object}`,
      );
    }

    // 4. Validate position bounds
    if (
      event.position.x < 0 || event.position.x > 1 ||
      event.position.y < 0 || event.position.y > 1
    ) {
      throw new ForbiddenException('Position out of bounds');
    }

    // 5. Idempotency check
    const existing = await this.prisma.ritualInteraction.findUnique({
      where: { roomId_eventId: { roomId: event.roomId, eventId: event.eventId } },
    });
    if (existing) return { duplicate: true, interaction: existing };

    // 6. Get next sequence number transactionally
    const [interaction] = await this.prisma.$transaction(async (tx) => {
      const count = await tx.ritualInteraction.count({ where: { roomId: event.roomId } });
      const interaction = await tx.ritualInteraction.create({
        data: {
          roomId: event.roomId,
          eventId: event.eventId,
          sequence: count + 1,
          senderId,
          targetId: event.targetParticipantId,
          object: event.object as any,
          action: event.action as any,
          positionX: event.position.x,
          positionY: event.position.y,
        },
      });
      await tx.room.update({
        where: { id: event.roomId },
        data: { revision: { increment: 1 } },
      });
      return [interaction];
    });

    return { duplicate: false, interaction };
  }

  async clearInteractions(roomId: string) {
    await this.prisma.$transaction([
      this.prisma.ritualInteraction.deleteMany({ where: { roomId } }),
      this.prisma.room.update({
        where: { id: roomId },
        data: { revision: { increment: 1 } },
      }),
    ]);
  }
}
