import { Controller, Get, Param, Query } from '@nestjs/common';
import type { JurisdictionsService } from './jurisdictions.service';

@Controller('jurisdictions')
export class JurisdictionsController {
  constructor(private readonly jurisdictions: JurisdictionsService) {}

  @Get()
  list() {
    return this.jurisdictions.list();
  }

  @Get(':code/laws')
  laws(@Param('code') code: string, @Query('category') category?: string) {
    return this.jurisdictions.findApplicableLaws(code, category);
  }
}
