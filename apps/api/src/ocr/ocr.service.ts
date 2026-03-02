import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import { parseReceiptFields, type ParsedReceiptFields } from './receipt-parser';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Runs OCR on an image buffer and returns the raw extracted text.
   * Loads both English and French language packs for Canadian receipt support.
   */
  async recognizeText(buffer: Buffer, mimeType: string): Promise<string> {
    this.logger.debug(`Running OCR on ${mimeType} buffer (${buffer.length} bytes)`);

    const { data } = await Tesseract.recognize(buffer, 'eng+fra', {
      logger: () => {}, // suppress progress output
    });

    return data.text;
  }

  /**
   * Convenience wrapper that runs OCR and then parses the extracted text.
   */
  async parseReceipt(buffer: Buffer, mimeType: string): Promise<ParsedReceiptFields> {
    const rawText = await this.recognizeText(buffer, mimeType);
    return parseReceiptFields(rawText);
  }
}
