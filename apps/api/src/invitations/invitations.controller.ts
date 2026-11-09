import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvitationsService } from './invitations.service';
import { Request } from 'express';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  async accept(@Param('token') token: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.invitationsService.accept(token, userId);
  }
}
