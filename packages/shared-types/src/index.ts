/**
 * @warranty-tool/shared-types
 *
 * Shared TypeScript types consumed by both the API and the web frontend.
 *
 * Domain areas (to be defined as the data model is established):
 *
 *  Products & Models
 *    - Product, ProductModel, ProductCategory
 *
 *  Warranties
 *    - Warranty, WarrantyType (manufacturer, statutory, extended, lifetime)
 *    - WarrantyDocument, WarrantyStatus
 *
 *  Receipts & Purchases
 *    - Receipt, PurchaseDetail, Retailer
 *
 *  Documents & Manuals
 *    - ProductManual, DocumentSource, DocumentType
 *
 *  Users & Accounts
 *    - User, UserProduct, UserDocument
 *
 *  Jurisdiction
 *    - Country, Province, ConsumerLaw
 */

export type { AuthResponse, AuthUser, JwtPayload } from './auth';
export type { ProductSummary, UserProductDetail, WarrantySummary, WarrantyType } from './products';
export type { OcrStatus, ReceiptFields } from './receipts';
