import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ skip, take: limit, orderBy: { brand: 'asc' } }),
      this.prisma.product.count(),
    ]);
    return { items, total, page, limit };
  }

  async search(q?: string, category?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      ...(q && {
        OR: [
          { brand: { contains: q, mode: 'insensitive' as const } },
          { model: { contains: q, mode: 'insensitive' as const } },
        ],
      }),
      ...(category && { category: { equals: category, mode: 'insensitive' as const } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { brand: 'asc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { brand_model: { brand: dto.brand, model: dto.model } },
    });
    if (existing) throw new ConflictException('Product already exists');

    return this.prisma.product.create({ data: dto });
  }

  async findOrCreate(dto: CreateProductDto) {
    return this.prisma.product.upsert({
      where: { brand_model: { brand: dto.brand, model: dto.model } },
      update: {},
      create: dto,
    });
  }
}
