import { IsIn, IsString, Matches } from 'class-validator';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
] as const;

export class RequestUploadUrlDto {
  @IsString()
  filename!: string;

  @IsIn(ALLOWED_CONTENT_TYPES, {
    message: `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
  })
  contentType!: string;

  /** SHA-256 hex of the file, computed client-side before upload. */
  @IsString()
  @Matches(/^[a-f0-9]{64}$/, { message: 'sha256 must be a 64-character lowercase hex string' })
  sha256!: string;
}
