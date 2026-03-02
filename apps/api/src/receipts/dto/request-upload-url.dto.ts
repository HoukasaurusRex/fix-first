export class RequestUploadUrlDto {
  /** SHA-256 hex of the file, computed client-side before upload. */
  sha256!: string;
  /** File extension without dot: jpg, png, heic, pdf */
  ext!: string;
  /** MIME type of the file */
  contentType!: string;
}
