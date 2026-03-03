import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { PrismaService } from '../prisma/prisma.service';
import type { EmailService } from './email.service';

@Injectable()
export class WarrantyExpiryScheduler {
  private readonly logger = new Logger(WarrantyExpiryScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Runs daily at 08:00 UTC */
  @Cron('0 8 * * *', { timeZone: 'UTC' })
  async checkExpiringWarranties() {
    this.logger.log('Running warranty expiry check…');
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch all users with notification prefs enabled
    const users = await this.prisma.user.findMany({
      where: {
        notificationPref: { emailEnabled: true },
      },
      select: {
        id: true,
        email: true,
        notificationPref: { select: { daysBeforeExpiry: true } },
        userProducts: {
          select: {
            product: { select: { brand: true, model: true } },
            warranties: {
              where: { alertEnabled: true, endDate: { not: null } },
              select: {
                id: true,
                type: true,
                endDate: true,
                lastAlertedAt: true,
              },
            },
          },
        },
      },
    });

    let alertCount = 0;
    for (const user of users) {
      const daysBeforeExpiry = user.notificationPref?.daysBeforeExpiry ?? 30;
      const cutoff = new Date(now.getTime() + daysBeforeExpiry * 24 * 60 * 60 * 1000);

      for (const up of user.userProducts) {
        const productName = `${up.product.brand} ${up.product.model}`;
        for (const warranty of up.warranties) {
          if (!warranty.endDate) continue;
          const endDate = new Date(warranty.endDate);

          // Check if within alert window and not already alerted recently
          const msLeft = endDate.getTime() - now.getTime();
          const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
          if (daysLeft <= 0 || endDate > cutoff) continue;
          if (warranty.lastAlertedAt && warranty.lastAlertedAt > yesterday) continue;

          await this.email.sendWarrantyExpiryAlert({
            to: user.email,
            productName,
            warrantyType: warranty.type,
            daysLeft,
            expiryDate: endDate,
          });

          await this.prisma.warranty.update({
            where: { id: warranty.id },
            data: { lastAlertedAt: now },
          });

          alertCount++;
        }
      }
    }

    this.logger.log(`Warranty expiry check complete. Sent ${alertCount} alert(s).`);
  }
}
