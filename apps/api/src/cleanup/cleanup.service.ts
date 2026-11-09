import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRooms() {
    const now = new Date();
    this.logger.log('Running expired room cleanup...');

    // Mark expired WAITING rooms
    const { count: expiredCount } = await this.prisma.room.updateMany({
      where: {
        status: { in: ['WAITING', 'CONNECTED'] },
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (expiredCount > 0) {
      this.logger.log(`Marked ${expiredCount} rooms as EXPIRED`);
    }

    // Also expire pending invitations
    const { count: invCount } = await this.prisma.roomInvitation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    if (invCount > 0) {
      this.logger.log(`Marked ${invCount} invitations as EXPIRED`);
    }
  }
}
