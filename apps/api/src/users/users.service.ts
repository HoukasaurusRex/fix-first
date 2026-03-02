import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const VALID_PROVINCES = new Set([
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT',
]);

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  province: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: USER_SELECT });
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    if (dto.province !== undefined && !VALID_PROVINCES.has(dto.province.toUpperCase())) {
      throw new BadRequestException(`Invalid province code: ${dto.province}`);
    }

    const data: { name?: string; province?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.province !== undefined) data.province = dto.province.toUpperCase();

    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }
}
