import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const FEDERAL_CODE = 'CA';

@Injectable()
export class JurisdictionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.jurisdiction.findMany({ orderBy: { code: 'asc' } });
  }

  async findApplicableLaws(code: string, category?: string) {
    const provincial = await this.prisma.jurisdiction.findUnique({
      where: { code: code.toUpperCase() },
      include: { laws: true },
    });
    if (!provincial) return { jurisdiction: { code: code.toUpperCase(), name: 'Unknown' }, laws: [] };

    const federal = await this.prisma.jurisdiction.findUnique({
      where: { code: FEDERAL_CODE },
      include: { laws: true },
    });

    const allLaws = [...(federal?.laws ?? []), ...provincial.laws];

    const filtered = category
      ? allLaws.filter(
          (l) => !l.productCategory || l.productCategory.toLowerCase() === category.toLowerCase(),
        )
      : allLaws;

    return {
      jurisdiction: { code: provincial.code, name: provincial.name },
      laws: filtered,
    };
  }
}
