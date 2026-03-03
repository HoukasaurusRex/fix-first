import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JurisdictionsController } from './jurisdictions.controller';
import { JurisdictionsService } from './jurisdictions.service';

@Module({
  imports: [PrismaModule],
  controllers: [JurisdictionsController],
  providers: [JurisdictionsService],
  exports: [JurisdictionsService],
})
export class JurisdictionsModule {}
