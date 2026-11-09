import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { InvitationsModule } from './invitations/invitations.module';
import { ParticipantsModule } from './participants/participants.module';
import { MediaModule } from './media/media.module';
import { RitualModule } from './ritual/ritual.module';
import { RealtimeModule } from './realtime/realtime.module';
import { CleanupModule } from './cleanup/cleanup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    InvitationsModule,
    ParticipantsModule,
    MediaModule,
    RitualModule,
    RealtimeModule,
    CleanupModule,
  ],
})
export class AppModule {}
