import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OcrService } from '../ocr/ocr.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import type { UpdateReceiptDto } from './dto/update-receipt.dto';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly ocr: OcrService,
  ) {}

  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto) {
    const s3Key = this.storage.receiptKey(userId, dto.sha256, dto.ext);

    const receipt = await this.prisma.receipt.create({
      data: { userId, s3Key },
    });

    const uploadUrl = await this.storage.presignedPutUrl(s3Key, dto.contentType);
    return { uploadUrl, s3Key, receiptId: receipt.id };
  }

  async confirmUpload(userId: string, receiptId: string) {
    const receipt = await this.findAndAssertOwner(userId, receiptId);

    await this.prisma.receipt.update({
      where: { id: receipt.id },
      data: { ocrStatus: 'processing' },
    });

    // Trigger OCR asynchronously — do not block the HTTP response
    setImmediate(() => this.runOcr(receipt.id, receipt.s3Key));

    return { receiptId: receipt.id, ocrStatus: 'processing' };
  }

  async findById(userId: string, receiptId: string) {
    const receipt = await this.findAndAssertOwner(userId, receiptId);
    const imageUrl = await this.storage.presignedGetUrl(receipt.s3Key);
    return { ...receipt, imageUrl };
  }

  async update(userId: string, receiptId: string, dto: UpdateReceiptDto) {
    await this.findAndAssertOwner(userId, receiptId);

    return this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        ...(dto.retailer !== undefined && { retailer: dto.retailer }),
        ...(dto.productName !== undefined && { productName: dto.productName }),
        ...(dto.purchasedAt !== undefined && { purchasedAt: new Date(dto.purchasedAt) }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod }),
      },
    });
  }

  async link(userId: string, receiptId: string, userProductId: string) {
    await this.findAndAssertOwner(userId, receiptId);

    return this.prisma.receipt.update({
      where: { id: receiptId },
      data: { userProductId },
    });
  }

  // -------------------------------------------------------------------------

  private async findAndAssertOwner(userId: string, receiptId: string) {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundException('Receipt not found');
    if (receipt.userId !== userId) throw new ForbiddenException();
    return receipt;
  }

  private async runOcr(receiptId: string, s3Key: string) {
    try {
      const ext = s3Key.split('.').pop() ?? 'jpg';
      const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext}`;

      const buffer = await this.storage.download(s3Key);
      const fields = await this.ocr.parseReceipt(buffer, mimeType);

      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: {
          ocrStatus: 'completed',
          rawText: undefined,
          retailer: fields.retailer ?? undefined,
          productName: fields.productName ?? undefined,
          purchasedAt: fields.purchaseDate ? new Date(fields.purchaseDate) : undefined,
          price: fields.price ?? undefined,
          paymentMethod: fields.paymentMethod ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error(`OCR failed for receipt ${receiptId}: ${err}`);
      await this.prisma.receipt.update({
        where: { id: receiptId },
        data: { ocrStatus: 'failed' },
      });
    }
  }
}
