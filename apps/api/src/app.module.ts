import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { JurisdictionsModule } from './jurisdictions/jurisdictions.module';
import { GuidanceModule } from './guidance/guidance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OcrModule } from './ocr/ocr.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StorageModule } from './storage/storage.module';
import { UserProductsModule } from './user-products/user-products.module';
import { UsersModule } from './users/users.module';
import { WarrantiesModule } from './warranties/warranties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    UserProductsModule,
    WarrantiesModule,
    StorageModule,
    OcrModule,
    ReceiptsModule,
    JurisdictionsModule,
    NotificationsModule,
    GuidanceModule,
  ],
})
export class AppModule {}
