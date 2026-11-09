import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { RitualModule } from '../ritual/ritual.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [RoomsModule, RitualModule, AuthModule, UsersModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
