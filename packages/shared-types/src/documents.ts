export type DocumentType = 'manual' | 'warranty_certificate' | 'other';

export interface DocumentSummary {
  id: string;
  type: DocumentType;
  filename: string;
  sizeBytes: number;
  /** Always 'community' — the uploader is anonymized. */
  uploadedBy: 'community';
  product: { id: string; brand: string; model: string } | null;
  createdAt: string;
}
