import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { DocumentsService } from './documents.service';
import type { CheckDocumentDto } from './dto/check-document.dto';
import type { ConfirmUploadDto } from './dto/confirm-upload.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post('check')
  check(@Body() dto: CheckDocumentDto) {
    return this.documents.check(dto.sha256, dto.filename, dto.contentType);
  }

  @Post('confirm-upload')
  confirmUpload(@Req() req: Request, @Body() dto: ConfirmUploadDto) {
    return this.documents.confirmUpload(req.user!.sub, dto);
  }

  @Get(':id/download-url')
  getDownloadUrl(@Param('id') id: string) {
    return this.documents.getDownloadUrl(id).then((url) => ({ url }));
  }

  @Get()
  findAll() {
    return this.documents.findAll();
  }
}
