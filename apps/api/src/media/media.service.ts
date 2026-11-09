import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class MediaService {
  constructor(
    private readonly config: ConfigService,
    private readonly roomsService: RoomsService,
  ) {}

  async generateLiveKitToken(roomId: string, userId: string) {
    const participant = await this.roomsService.assertMembership(roomId, userId);

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new ForbiddenException('LiveKit not configured');
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      ttl: '10m',
    });

    token.addGrant({
      roomJoin: true,
      room: `bhaifota_${roomId}`,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });

    return { token: await token.toJwt(), roomName: `bhaifota_${roomId}` };
  }
}
