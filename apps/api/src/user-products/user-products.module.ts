import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { JurisdictionsModule } from '../jurisdictions/jurisdictions.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UserProductsController } from './user-products.controller';
import { UserProductsService } from './user-products.service';

@Module({
  imports: [PrismaModule, AuthModule, JurisdictionsModule],
  controllers: [UserProductsController],
  providers: [UserProductsService],
  exports: [UserProductsService],
})
export class UserProductsModule {}
