import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateWarrantyDto } from './dto/create-warranty.dto';

@Injectable()
export class WarrantiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, userProductId: string, dto: CreateWarrantyDto) {
    await this.assertProductOwner(userId, userProductId);

    return this.prisma.warranty.create({
      data: {
        userProductId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        provider: dto.provider,
        notes: dto.notes,
      },
    });
  }

  async findExpiring(userId: string, days: number) {
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const now = new Date();

    return this.prisma.warranty.findMany({
      where: {
        userProduct: { userId },
        type: { notIn: ['lifetime', 'statutory'] },
        endDate: { gte: now, lte: cutoff },
      },
      include: { userProduct: { include: { product: true } } },
      orderBy: { endDate: 'asc' },
    });
  }

  /** Returns true when the warranty has a fixed end date that is in the past. */
  isExpired(warranty: { type: string; endDate: Date | null }): boolean {
    if (warranty.type === 'lifetime' || warranty.type === 'statutory') return false;
    if (!warranty.endDate) return false;
    return warranty.endDate < new Date();
  }

  /** Returns days until expiry, or null for lifetime / statutory types. */
  daysUntilExpiry(warranty: { type: string; endDate: Date | null }): number | null {
    if (warranty.type === 'lifetime' || warranty.type === 'statutory') return null;
    if (!warranty.endDate) return null;
    const ms = warranty.endDate.getTime() - Date.now();
    return Math.ceil(ms / (24 * 60 * 60 * 1000));
  }

  // -------------------------------------------------------------------------

  private async assertProductOwner(userId: string, userProductId: string) {
    const up = await this.prisma.userProduct.findUnique({ where: { id: userProductId } });
    if (!up) throw new NotFoundException('User product not found');
    if (up.userId !== userId) throw new ForbiddenException();
  }
}
