export class CreateWarrantyDto {
  type!: 'manufacturer' | 'statutory' | 'extended' | 'lifetime';
  startDate!: string;
  endDate?: string | null;
  provider?: string;
  notes?: string;
}
