import { z } from 'zod'

export const MAX_CSV_BYTES = 5 * 1024 * 1024 // 5 MB
export const MAX_CSV_ROWS = 2000 // incoming-stock validate/commit batches
export const MAX_SALES_ROWS = 5000 // historical sales uploads

const dateStr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((d) => !Number.isNaN(new Date(d).getTime()), { message: 'date is not a real calendar date' });

/** One historical sales row. totalRevenue is training data (not money movement);
 *  values are range-checked and quantities must be positive integers. */
export const salesRowSchema = z.object({
  date: dateStr,
  sku: z.string().trim().max(30).optional().default(''),
  productName: z.string().trim().min(1, 'productName is required').max(200),
  category: z.string().trim().max(80).optional().default('General'),
  quantity: z.coerce.number().int().min(1, 'quantity must be >= 1').max(100_000),
  unitPrice: z.coerce.number().finite().min(0).max(10_000_000),
  totalRevenue: z.coerce.number().finite().min(0).max(1_000_000_000),
  paymentMode: z.string().trim().min(1).max(20).optional().default('UPI'),
});

export const salesUploadSchema = z
  .object({
    rawCsv: z.string().max(MAX_CSV_BYTES, 'CSV exceeds the 5 MB limit').optional(),
    records: z.array(z.unknown()).max(MAX_SALES_ROWS, 'Too many records (max 5000)').optional(),
  })
  .refine((v) => v.rawCsv !== undefined || v.records !== undefined, {
    message: 'Provide rawCsv or records',
  });

/** Incoming-stock CSV: raw text (text/plain posts) or JSON envelope. */
export const incomingCsvJsonSchema = z.object({
  csvText: z.string().min(1, 'csvText is required').max(MAX_CSV_BYTES, 'CSV exceeds the 5 MB limit'),
  action: z.enum(['validate', 'commit']).optional(),
});

const incomingRowSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(30),
  quantity: z.coerce.number().positive('quantity must be > 0').finite().max(100_000),
  purchasePrice: z.coerce.number().min(0).finite().max(10_000_000),
  supplier: z.string().trim().max(100).optional().default(''),
});

export function validateIncomingRows(rows: unknown[]): {
  valid: Array<{ sku: string; quantity: number; purchasePrice: number; supplier: string }>;
  errors: Array<{ row: number; message: string }>;
} {
  const valid: Array<{ sku: string; quantity: number; purchasePrice: number; supplier: string }> = [];
  const errors: Array<{ row: number; message: string }> = [];
  rows.slice(0, MAX_CSV_ROWS).forEach((row, idx) => {
    const parsed = incomingRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({
        row: idx + 1,
        message: parsed.error.issues.map((i) => `${i.path.join('.') || 'row'}: ${i.message}`).join('; '),
      });
      return;
    }
    valid.push({
      ...parsed.data,
      quantity: Math.floor(parsed.data.quantity),
    });
  });
  if (rows.length > MAX_CSV_ROWS) {
    errors.push({ row: MAX_CSV_ROWS + 1, message: `Row cap exceeded — only the first ${MAX_CSV_ROWS} rows were read` });
  }
  return { valid, errors };
}
