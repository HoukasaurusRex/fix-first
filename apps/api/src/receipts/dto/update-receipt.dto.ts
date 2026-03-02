import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateReceiptDto {
  @IsOptional()
  @IsString()
  retailer?: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  userProductId?: string;
}
