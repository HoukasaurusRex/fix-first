import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  daysBeforeExpiry?: number;
}
