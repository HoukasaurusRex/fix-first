import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'node:crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new S3Client({
      region: this.config.getOrThrow<string>('AWS_REGION'),
    });
    this.bucket = this.config.getOrThrow<string>('AWS_S3_BUCKET');
  }

  /** Generates a presigned PUT URL for browser-direct uploads (5-minute expiry). */
  presignedPutUrl(key: string, contentType: string, expiresIn = 300): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Generates a presigned GET URL for private file access (1-hour expiry). */
  presignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /** Uploads a buffer directly from the server (used for OCR-processed files). */
  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  /** Deletes an object from S3. */
  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // -------------------------------------------------------------------------
  // Key helpers

  /** SHA-256 hex digest of a buffer using node:crypto. */
  sha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /** S3 key for a user-scoped receipt upload. */
  receiptKey(userId: string, hash: string, ext: string): string {
    return `receipts/${userId}/${hash}.${ext}`;
  }

  /** S3 key for a globally-deduplicated product document. */
  documentKey(hash: string, ext: string): string {
    return `documents/global/${hash}.${ext}`;
  }
}
