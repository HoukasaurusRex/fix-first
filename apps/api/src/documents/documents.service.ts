import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import type { ConfirmUploadDto } from './dto/confirm-upload.dto';
import type { DocumentSummary } from '@fixfirst/shared-types';

type CheckResult =
  | { exists: true; documentId: string }
  | { exists: false; uploadUrl: string; s3Key: string };

function toSummary(doc: {
  id: string;
  filename: string;
  type: string;
  sizeBytes: number;
  createdAt: Date;
  product: { id: string; brand: string; model: string } | null;
}): DocumentSummary {
  return {
    id: doc.id,
    filename: doc.filename,
    type: doc.type as DocumentSummary['type'],
    sizeBytes: doc.sizeBytes,
    uploadedBy: 'community',
    product: doc.product,
    createdAt: doc.createdAt.toISOString(),
  };
}

const DOC_SELECT = {
  id: true,
  filename: true,
  type: true,
  sizeBytes: true,
  createdAt: true,
  product: { select: { id: true, brand: true, model: true } },
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Checks if a document with the given SHA-256 already exists.
   * Returns existing documentId, or a presigned PUT URL + s3Key for upload.
   */
  async check(sha256: string, filename: string, contentType: string): Promise<CheckResult> {
    const existing = await this.prisma.document.findUnique({ where: { sha256 } });
    if (existing) return { exists: true, documentId: existing.id };

    const ext = filename.split('.').pop() ?? 'bin';
    const s3Key = this.storage.documentKey(sha256, ext);
    const uploadUrl = await this.storage.presignedPutUrl(s3Key, contentType, 900); // 15 min
    return { exists: false, uploadUrl, s3Key };
  }

  /**
   * Upserts the document record after a confirmed S3 upload.
   * Safe to call multiple times for the same sha256 (race-condition safe).
   */
  async confirmUpload(userId: string, dto: ConfirmUploadDto): Promise<DocumentSummary> {
    const doc = await this.prisma.document.upsert({
      where: { sha256: dto.sha256 },
      create: {
        sha256: dto.sha256,
        s3Key: dto.s3Key,
        filename: dto.filename,
        sizeBytes: dto.sizeBytes,
        type: dto.type,
        productId: dto.productId ?? null,
        uploadedById: userId,
      },
      update: {},
      select: DOC_SELECT,
    });
    return toSummary(doc);
  }

  /** Returns a 60-second presigned GET URL for a document. */
  async getDownloadUrl(documentId: string): Promise<string> {
    const doc = await this.prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    return this.storage.presignedGetUrl(doc.s3Key, 60);
  }

  /** Returns all documents linked to a product model. */
  async findForProduct(productId: string): Promise<DocumentSummary[]> {
    const docs = await this.prisma.document.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: DOC_SELECT,
    });
    return docs.map(toSummary);
  }

  /** Returns all documents (global library). */
  async findAll(): Promise<DocumentSummary[]> {
    const docs = await this.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      select: DOC_SELECT,
    });
    return docs.map(toSummary);
  }
}
