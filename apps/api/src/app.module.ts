import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { OcrModule } from './ocr/ocr.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { StorageModule } from './storage/storage.module';
import { UserProductsModule } from './user-products/user-products.module';
import { UsersModule } from './users/users.module';
import { WarrantiesModule } from './warranties/warranties.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    UserProductsModule,
    WarrantiesModule,
    StorageModule,
    OcrModule,
    ReceiptsModule,
  ],
})
export class AppModule {}
