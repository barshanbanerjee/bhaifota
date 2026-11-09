import { Controller, Post, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MediaService } from './media.service';
import type { Request } from 'express';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post(':id/media-token')
  async getToken(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.mediaService.generateLiveKitToken(id, userId);
  }
}
