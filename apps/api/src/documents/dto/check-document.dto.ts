import { IsString, Length } from 'class-validator';

export class CheckDocumentDto {
  @IsString()
  @Length(64, 64)
  sha256!: string;

  @IsString()
  filename!: string;

  @IsString()
  contentType!: string;

  @IsString()
  @Length(1, 100)
  sizeBytes!: number;
}
