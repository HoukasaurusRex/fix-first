import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { GuidanceController } from './guidance.controller';
import { GuidanceService } from './guidance.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [GuidanceController],
  providers: [GuidanceService],
  exports: [GuidanceService],
})
export class GuidanceModule {}
