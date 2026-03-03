import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import type { CreateWarrantyDto } from './dto/create-warranty.dto';
import type { WarrantiesService } from './warranties.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class WarrantiesController {
  constructor(private readonly warranties: WarrantiesService) {}

  @Post('user-products/:id/warranties')
  create(
    @Req() req: Request,
    @Param('id') userProductId: string,
    @Body() dto: CreateWarrantyDto,
  ) {
    const { sub } = req['user'] as JwtPayload;
    return this.warranties.create(sub, userProductId, dto);
  }

  @Get('warranties/expiring')
  expiring(@Req() req: Request, @Query('days') days?: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.warranties.findExpiring(sub, days ? parseInt(days, 10) : 30);
  }
}
