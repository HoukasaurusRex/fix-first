export interface ParsedReceiptFields {
  purchaseDate: string | null;
  retailer: string | null;
  productName: string | null;
  price: number | null;
  paymentMethod: string | null;
}

// ---------------------------------------------------------------------------
// Date parsing

const DATE_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => string | null }> = [
  // YYYY-MM-DD  e.g. 2024-03-15
  {
    re: /\b(\d{4})-(\d{2})-(\d{2})\b/,
    parse: (m) => `${m[1]}-${m[2]}-${m[3]}`,
  },
  // MM/DD/YYYY  e.g. 03/15/2024
  {
    re: /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
    parse: (m) => `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`,
  },
  // DD Mon YYYY  e.g. 15 Mar 2024
  {
    re: /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/i,
    parse: (m) => {
      const month = MONTH_MAP[m[2].substring(0, 3).toLowerCase()];
      return month ? `${m[3]}-${month}-${m[1].padStart(2, '0')}` : null;
    },
  },
  // Mon DD, YYYY  e.g. Mar 15, 2024
  {
    re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i,
    parse: (m) => {
      const month = MONTH_MAP[m[1].substring(0, 3).toLowerCase()];
      return month ? `${m[3]}-${month}-${m[2].padStart(2, '0')}` : null;
    },
  },
];

const MONTH_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function extractDate(text: string): string | null {
  for (const { re, parse } of DATE_PATTERNS) {
    const match = text.match(re);
    if (match) {
      const result = parse(match);
      if (result) return result;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Price parsing — finds the largest dollar amount (likely the total)

function extractPrice(text: string): number | null {
  const matches = [...text.matchAll(/\$?\s*(\d{1,6}[.,]\d{2})\b/g)];
  if (!matches.length) return null;

  const amounts = matches
    .map((m) => parseFloat(m[1].replace(',', '.')))
    .filter((n) => !isNaN(n));

  return amounts.length ? Math.max(...amounts) : null;
}

// ---------------------------------------------------------------------------
// Retailer — first non-empty line that looks like a business name

function extractRetailer(lines: string[]): string | null {
  const skip = /^(date|receipt|invoice|total|subtotal|tax|hst|gst|pst|\d)/i;
  for (const line of lines.slice(0, 6)) {
    const trimmed = line.trim();
    if (trimmed.length >= 3 && !skip.test(trimmed)) return trimmed;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Product name — line containing a recognisable product pattern

function extractProductName(text: string): string | null {
  // Look for lines with "model", product identifiers, or brand-like text
  const re =
    /^(?!.*(?:total|tax|hst|gst|subtotal|date|receipt|invoice|payment|amount|balance))(.{5,60})$/im;
  const lines = text.split('\n');
  for (const line of lines.slice(2)) {
    const trimmed = line.trim();
    if (re.test(trimmed) && /[a-zA-Z]{3,}/.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Payment method

const PAYMENT_PATTERNS: Record<string, RegExp> = {
  interac: /\binterac\b/i,
  visa: /\bvisa\b/i,
  mastercard: /\bmastercard\b|\bmaster card\b/i,
  amex: /\bamex\b|\bamerican express\b/i,
  debit: /\bdebit\b/i,
  cash: /\bcash\b/i,
};

function extractPaymentMethod(text: string): string | null {
  for (const [method, re] of Object.entries(PAYMENT_PATTERNS)) {
    if (re.test(text)) return method;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main entry point

export function parseReceiptFields(rawText: string): ParsedReceiptFields {
  const lines = rawText.split('\n').filter((l) => l.trim());
  return {
    purchaseDate: extractDate(rawText),
    retailer: extractRetailer(lines),
    productName: extractProductName(rawText),
    price: extractPrice(rawText),
    paymentMethod: extractPaymentMethod(rawText),
  };
}
