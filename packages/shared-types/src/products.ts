export type WarrantyType = 'manufacturer' | 'statutory' | 'extended' | 'lifetime';

export interface ProductSummary {
  id: string;
  brand: string;
  model: string;
  category: string;
  createdAt: string;
}

export interface WarrantySummary {
  id: string;
  type: WarrantyType;
  startDate: string;
  endDate: string | null;
  provider: string | null;
  notes: string | null;
  isExpired: boolean;
  daysUntilExpiry: number | null;
  createdAt: string;
}

export interface UserProductDetail {
  id: string;
  userId: string;
  productId: string;
  purchasedAt: string | null;
  retailer: string | null;
  price: string | null;
  createdAt: string;
  product: ProductSummary;
  warranties: Pick<WarrantySummary, 'id' | 'type' | 'endDate'>[];
}
