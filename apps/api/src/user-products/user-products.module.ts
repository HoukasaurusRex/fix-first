import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserProductsController } from './user-products.controller';
import { UserProductsService } from './user-products.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UserProductsController],
  providers: [UserProductsService],
  exports: [UserProductsService],
})
export class UserProductsModule {}
