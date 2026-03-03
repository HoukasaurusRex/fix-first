import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
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
  controllers: [HealthController],
  providers: [
    // Apply global rate limit: 100 requests per 60 seconds per IP.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    LoggerModule.forRoot({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pinoHttp: {
        ...(process.env.NODE_ENV !== 'production' && {
          transport: { target: 'pino-pretty', options: { singleLine: true } },
        }),
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      } as any,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    DocumentsModule,
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
