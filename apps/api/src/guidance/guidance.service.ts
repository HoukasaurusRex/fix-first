import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';

type ChecklistStatus = 'checked' | 'unchecked' | 'n-a';

type ChecklistItem = {
  key: string;
  label: string;
  status: ChecklistStatus;
  detail?: string;
};

const RESOURCES: Record<string, { label: string; url: string }[]> = {
  electronics: [
    { label: 'iFixit Repair Guides', url: 'https://www.ifixit.com/Device' },
    { label: 'Consumer Electronics Repair Canada', url: 'https://www.canada.ca/en/environment-climate-change/services/managing-reducing-waste/reduce/electronics.html' },
    { label: 'Right to Repair Canada', url: 'https://www.righttorepair.ca/' },
  ],
  appliances: [
    { label: 'Appliance411 Repair Help', url: 'https://www.appliance411.com/repair.php' },
    { label: 'ReparoMaintenance', url: 'https://www.canada.ca/en/health-canada/services/home-safety.html' },
    { label: 'ENERGY STAR Canada', url: 'https://www.energystar.gov/rebate-finder' },
  ],
  default: [
    { label: 'Office of Consumer Affairs Canada', url: 'https://www.ic.gc.ca/eic/site/oca-bc.nsf/eng/home' },
    { label: 'Canadian Consumer Handbook', url: 'https://www.consumerhandbook.ca/' },
    { label: 'Repair Café (find local repair events)', url: 'https://www.repaircafe.org/en/locations/' },
  ],
};

@Injectable()
export class GuidanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getChecklist(userId: string, userProductId: string): Promise<ChecklistItem[]> {
    const up = await this.loadUserProduct(userId, userProductId);
    const now = new Date();
    const { warranties, purchasedAt } = up;

    const hasManufacturer = warranties.some(
      (w) => w.type === 'manufacturer' && (w.endDate === null || new Date(w.endDate) > now),
    );
    const hasStatutory = warranties.some((w) => w.type === 'statutory');
    const hasExtended = warranties.some(
      (w) => w.type === 'extended' && (w.endDate === null || new Date(w.endDate) > now),
    );
    const hasReceipt = await this.prisma.receipt.count({
      where: { userProductId: up.id, ocrStatus: 'completed' },
    });

    return [
      {
        key: 'manufacturer_warranty',
        label: 'Active manufacturer warranty',
        status: hasManufacturer ? 'checked' : 'unchecked',
        detail: hasManufacturer ? 'Manufacturer warranty is active.' : 'No active manufacturer warranty found.',
      },
      {
        key: 'statutory_protection',
        label: 'Statutory consumer protection',
        status: hasStatutory ? 'checked' : 'unchecked',
        detail: hasStatutory
          ? 'Statutory rights have been recorded for this product.'
          : 'No statutory warranty entry found. Set your province in settings to auto-create one.',
      },
      {
        key: 'extended_warranty',
        label: 'Extended warranty',
        status: hasExtended ? 'checked' : 'n-a',
        detail: hasExtended ? 'Extended warranty is active.' : undefined,
      },
      {
        key: 'proof_of_purchase',
        label: 'Proof of purchase (receipt)',
        status: hasReceipt > 0 ? 'checked' : 'unchecked',
        detail: hasReceipt > 0
          ? 'Receipt on file.'
          : 'No receipt uploaded. Upload a receipt to strengthen your warranty claim.',
      },
      {
        key: 'recall_check',
        label: 'Product recall status',
        status: 'n-a',
        detail: 'Check https://recalls-rappels.canada.ca/ for active recalls on this product.',
      },
      {
        key: 'purchase_date',
        label: 'Purchase date recorded',
        status: purchasedAt ? 'checked' : 'unchecked',
        detail: purchasedAt
          ? `Purchased on ${new Date(purchasedAt).toLocaleDateString()}.`
          : 'No purchase date set.',
      },
    ];
  }

  async getRepairOrReplace(
    userId: string,
    userProductId: string,
  ): Promise<{ recommendation: string; reasons: string[]; warrantyStatus: string }> {
    const up = await this.loadUserProduct(userId, userProductId);
    const now = new Date();
    const { warranties, purchasedAt } = up;

    const hasActiveWarranty = warranties.some(
      (w) =>
        w.type === 'statutory' ||
        w.type === 'lifetime' ||
        (w.endDate !== null && new Date(w.endDate) > now),
    );

    const warrantyStatus = hasActiveWarranty ? 'active' : 'expired_or_none';

    if (hasActiveWarranty) {
      return {
        recommendation: 'check_warranty',
        reasons: [
          'You have an active warranty or statutory protection.',
          'Contact the retailer or manufacturer to initiate a warranty claim before paying for repair.',
        ],
        warrantyStatus,
      };
    }

    const ageMs = purchasedAt ? now.getTime() - new Date(purchasedAt).getTime() : null;
    const ageYears = ageMs !== null ? ageMs / (365.25 * 24 * 60 * 60 * 1000) : null;

    if (ageYears !== null && ageYears < 1) {
      return {
        recommendation: 'repair',
        reasons: [
          'Product is less than 1 year old.',
          'Repair is usually cost-effective for newer products.',
          'Even without a recorded warranty, you may have statutory rights — check your province.',
        ],
        warrantyStatus,
      };
    }

    if (ageYears !== null && ageYears > 5) {
      return {
        recommendation: 'replace',
        reasons: [
          'Product is more than 5 years old and has no active warranty.',
          'Repair costs for older appliances often approach replacement cost.',
          'Consider an ENERGY STAR certified replacement for energy savings.',
        ],
        warrantyStatus,
      };
    }

    return {
      recommendation: 'repair',
      reasons: [
        'No active warranty found, but repair is often more sustainable.',
        'Get a repair estimate before deciding — if repair cost exceeds 50% of replacement, consider replacing.',
      ],
      warrantyStatus,
    };
  }

  getResources(category?: string): { label: string; url: string }[] {
    const key = category?.toLowerCase() ?? 'default';
    return RESOURCES[key] ?? [...(RESOURCES[key.split(' ')[0]] ?? []), ...RESOURCES['default']];
  }

  private async loadUserProduct(userId: string, userProductId: string) {
    const up = await this.prisma.userProduct.findUnique({
      where: { id: userProductId },
      include: {
        product: true,
        warranties: { select: { id: true, type: true, endDate: true } },
      },
    });
    if (!up) throw new NotFoundException('User product not found');
    if (up.userId !== userId) throw new ForbiddenException();
    return up;
  }
}
