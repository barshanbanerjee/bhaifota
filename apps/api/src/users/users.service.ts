import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: { googleId: string; email: string; name: string; image?: string }) {
    return this.prisma.user.upsert({
      where: { googleId: data.googleId },
      update: { email: data.email, name: data.name, image: data.image },
      create: data,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }
}
