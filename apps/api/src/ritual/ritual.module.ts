import { Module } from '@nestjs/common';
import { RitualService } from './ritual.service';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  providers: [RitualService],
  exports: [RitualService],
})
export class RitualModule {}
