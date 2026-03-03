import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { DocumentType } from '../../generated/prisma/client';

export class ConfirmUploadDto {
  @IsString()
  @Length(64, 64)
  sha256!: string;

  @IsString()
  s3Key!: string;

  @IsString()
  filename!: string;

  @IsInt()
  @Min(1)
  sizeBytes!: number;

  @IsString()
  contentType!: string;

  @IsEnum(DocumentType)
  type!: DocumentType;

  @IsString()
  @IsOptional()
  productId?: string;
}
