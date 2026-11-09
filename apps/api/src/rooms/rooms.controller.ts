import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RoomsService } from './rooms.service';
import { IsEmail, IsIn } from 'class-validator';
import { Request } from 'express';

class CreateRoomDto {
  @IsIn(['BROTHER', 'SISTER'])
  creatorRole: 'BROTHER' | 'SISTER';

  @IsEmail()
  invitedEmail: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() dto: CreateRoomDto, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.roomsService.create(userId, dto.creatorRole as any, dto.invitedEmail);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    let room = await this.roomsService.findById(id);
    if (!room) {
      room = await this.roomsService.findByCode(id);
    }
    if (!room) throw new NotFoundException('Room not found');
    await this.roomsService.assertMembership(room.id, userId);
    return room;
  }

  @Get(':id/state')
  async getState(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    return this.roomsService.getState(id, userId);
  }

  @Post(':id/end')
  @HttpCode(200)
  async endRoom(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user.id;
    await this.roomsService.assertMembership(id, userId);
    await this.roomsService.updateStatus(id, 'COMPLETED');
    return { success: true, status: 'COMPLETED' };
  }
}
