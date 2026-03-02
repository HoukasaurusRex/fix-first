import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { ReceiptsService } from './receipts.service';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post('upload-url')
  requestUploadUrl(@Req() req: Request, @Body() dto: RequestUploadUrlDto) {
    const { sub } = req['user'] as JwtPayload;
    return this.receipts.requestUploadUrl(sub, dto);
  }

  @Post('confirm-upload')
  confirmUpload(@Req() req: Request, @Body('receiptId') receiptId: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.receipts.confirmUpload(sub, receiptId);
  }

  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.receipts.findById(sub, id);
  }

  @Patch(':id')
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateReceiptDto) {
    const { sub } = req['user'] as JwtPayload;
    return this.receipts.update(sub, id, dto);
  }

  @Post(':id/link')
  link(@Req() req: Request, @Param('id') id: string, @Body('userProductId') userProductId: string) {
    const { sub } = req['user'] as JwtPayload;
    return this.receipts.link(sub, id, userProductId);
  }
}
