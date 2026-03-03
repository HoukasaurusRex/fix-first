import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from './email.service';
import { WarrantyExpiryScheduler } from './warranty-expiry.scheduler';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, WarrantyExpiryScheduler],
  exports: [EmailService],
})
export class NotificationsModule {}
