export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReceiptFields {
  id: string;
  userId: string;
  userProductId: string | null;
  s3Key: string;
  ocrStatus: OcrStatus;
  retailer: string | null;
  productName: string | null;
  purchasedAt: string | null;
  price: string | null;
  currency: string | null;
  paymentMethod: string | null;
  rawText: string | null;
  createdAt: string;
  updatedAt: string;
  /** Presigned S3 URL — included in GET /receipts/:id response only */
  imageUrl?: string;
}
