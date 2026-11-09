import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { ROOM_ALPHABET } from '@bhaifota/shared';
import { SiblingRole } from '@prisma/client';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly invitationsService: InvitationsService,
  ) {}

  generateRoomCode(): string {
    const bytes = randomBytes(6);
    return Array.from(bytes).map((b) => ROOM_ALPHABET[b % 32]).join('');
  }

  async create(creatorId: string, creatorRole: SiblingRole, invitedEmail: string) {
    const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundException('Creator not found');
    if (creator.email.toLowerCase() === invitedEmail.toLowerCase()) {
      throw new ForbiddenException('Cannot invite yourself');
    }

    const invitedRole: SiblingRole = creatorRole === 'BROTHER' ? 'SISTER' : 'BROTHER';
    const { raw, hash } = this.invitationsService.generateToken();
    const expiryHours = this.config.get<number>('ROOM_EXPIRY_HOURS', 24);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const invExpiryHours = this.config.get<number>('INVITATION_EXPIRY_HOURS', 24);
    const invExpiresAt = new Date(Date.now() + invExpiryHours * 60 * 60 * 1000);

    // Generate unique room code with collision retry
    let code: string;
    let attempts = 0;
    do {
      code = this.generateRoomCode();
      const existing = await this.prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      attempts++;
    } while (attempts < 5);

    const room = await this.prisma.room.create({
      data: {
        code: code!,
        expiresAt,
        participants: {
          create: { userId: creatorId, role: creatorRole },
        },
        invitation: {
          create: {
            creatorId,
            invitedEmail: invitedEmail.toLowerCase(),
            invitedRole,
            tokenHash: hash,
            expiresAt: invExpiresAt,
          },
        },
      },
      include: { participants: true, invitation: true },
    });

    // Send invitation email and notify via Resend
    await this.invitationsService.sendInvitationEmail(
      invitedEmail.toLowerCase(),
      creator.name,
      raw,
    );

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:3000');
    const inviteUrl = `${webUrl}/invite/${raw}`;

    return { room, invitedRole, inviteUrl };
  }

  async findById(id: string) {
    return this.prisma.room.findUnique({
      where: { id },
      include: { participants: { include: { user: true } }, invitation: true },
    });
  }

  async findByCode(code: string) {
    return this.prisma.room.findUnique({
      where: { code },
      include: { participants: { include: { user: true } }, invitation: true },
    });
  }

  async assertMembership(roomId: string, userId: string) {
    const participant = await this.prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant) throw new ForbiddenException('Not a member of this room');
    return participant;
  }

  async updateStatus(roomId: string, status: string) {
    return this.prisma.room.update({
      where: { id: roomId },
      data: { status: status as any, revision: { increment: 1 } },
    });
  }

  async getState(roomId: string, userId: string) {
    await this.assertMembership(roomId, userId);
    const room = await this.findById(roomId);
    if (!room) throw new NotFoundException('Room not found');
    const interactions = await this.prisma.ritualInteraction.findMany({
      where: { roomId },
      orderBy: { sequence: 'asc' },
    });
    return { room, interactions };
  }
}
