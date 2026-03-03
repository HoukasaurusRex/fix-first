import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import type { GuidanceService } from './guidance.service';

@Controller('guidance')
@UseGuards(JwtAuthGuard)
export class GuidanceController {
  constructor(private readonly guidance: GuidanceService) {}

  @Get('checklist/:userProductId')
  checklist(@Req() req: Request, @Param('userProductId') userProductId: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.guidance.getChecklist(sub, userProductId);
  }

  @Get('repair-or-replace/:userProductId')
  repairOrReplace(@Req() req: Request, @Param('userProductId') userProductId: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.guidance.getRepairOrReplace(sub, userProductId);
  }

  @Get('resources')
  resources(@Query('category') category?: string) {
    return this.guidance.getResources(category);
  }
}
