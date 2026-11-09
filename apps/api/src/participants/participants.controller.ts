import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParticipantsService } from './participants.service';
import { Request } from 'express';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Post(':id/ready')
  async setReady(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.participantsService.setReady(id, userId);
  }
}
