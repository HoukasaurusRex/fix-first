import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateUserProductDto } from './dto/create-user-product.dto';
import type { UpdateUserProductDto } from './dto/update-user-product.dto';

const INCLUDE = {
  product: true,
  warranties: { select: { id: true, type: true, endDate: true } },
} as const;

@Injectable()
export class UserProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.userProduct.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateUserProductDto) {
    const { productId, purchasedAt, retailer, price } = dto;
    return this.prisma.userProduct.create({
      data: {
        userId,
        productId,
        purchasedAt: purchasedAt ? new Date(purchasedAt) : undefined,
        retailer,
        price: price !== undefined ? price : undefined,
      },
      include: INCLUDE,
    });
  }

  async update(userId: string, id: string, dto: UpdateUserProductDto) {
    await this.assertOwner(userId, id);

    const { purchasedAt, retailer, price } = dto;
    return this.prisma.userProduct.update({
      where: { id },
      data: {
        ...(purchasedAt !== undefined && { purchasedAt: new Date(purchasedAt) }),
        ...(retailer !== undefined && { retailer }),
        ...(price !== undefined && { price }),
      },
      include: INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.userProduct.delete({ where: { id } });
  }

  private async assertOwner(userId: string, id: string) {
    const up = await this.prisma.userProduct.findUnique({ where: { id } });
    if (!up) throw new NotFoundException('User product not found');
    if (up.userId !== userId) throw new ForbiddenException();
  }
}
