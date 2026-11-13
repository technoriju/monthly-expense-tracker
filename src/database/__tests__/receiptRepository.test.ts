import type { ReceiptItemRecord, ReceiptRecord } from '@/features/receipts/types';
import type { TransactionRecord } from '@/features/transactions/types';

import { MIGRATIONS } from '../migrations';
import { categoryRepository } from '../repositories/categoryRepository';
import { dataRepository } from '../repositories/dataRepository';
import { receiptRepository } from '../repositories/receiptRepository';
import { transactionRepository } from '../repositories/transactionRepository';
import { createMigratedTestDatabase, type TestDatabase } from '../testing/createTestDatabase';

let mockDb: TestDatabase;

jest.mock('../client', () => ({
  getDatabase: async () => mockDb,
}));

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
});

afterEach(() => {
  mockDb.close();
});

async function txRecord(overrides: Partial<TransactionRecord> = {}): Promise<TransactionRecord> {
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  if (!food) throw new Error('missing food category');
  return {
    type: 'expense',
    amountMinor: 46_300,
    currency: 'INR',
    categoryId: food.id,
    occurredOn: '2025-05-14',
    note: null,
    paymentMethod: 'upi',
    source: 'manual',
    ...overrides,
  };
}

const receipt = (overrides: Partial<ReceiptRecord> = {}): ReceiptRecord => ({
  saveKey: 'draft-1',
  vendorName: 'FRESH MART',
  receiptNumber: 'FM-2041',
  receiptDate: '2025-05-14',
  imageFile: 'draft-1.jpg',
  originalOcrText: 'FRESH MART\nGrand Total 463.00',
  ocrProvider: 'mlkit',
  extractedTotalMinor: 46_300,
  subtotalMinor: 44_150,
  taxMinor: 2_208,
  discountMinor: null,
  chargesMinor: null,
  roundOffMinor: -58,
  ...overrides,
});

const item = (overrides: Partial<ReceiptItemRecord> = {}): ReceiptItemRecord => ({
  itemName: 'Basmati Rice',
  originalOcrName: 'Basmati Rice',
  quantityMilli: 2000,
  unit: 'kg',
  unitPriceMinor: 12_000,
  lineTotalMinor: 24_000,
  nameConfidence: 0.92,
  amountConfidence: 0.9,
  flags: [],
  userCorrected: false,
  ...overrides,
});

const count = async (table: string) =>
  (await mockDb.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))?.n;

describe('migration 005', () => {
  it('is the latest migration', () => {
    expect(MIGRATIONS[MIGRATIONS.length - 1]?.name).toBe('receipts');
  });

  it('rejects fractional, negative and too-large receipt amounts', async () => {
    const { transaction } = await receiptRepository.createWithTransaction(
      await txRecord(),
      receipt(),
      [],
    );
    const insert = (column: string, value: unknown) =>
      mockDb.runAsync(
        `INSERT INTO receipts (transaction_id, save_key, ${column}, created_at, updated_at)
         VALUES (?, ?, ?, 0, 0)`,
        [transaction.id + 1000, `k-${column}`, value as number],
      );
    await expect(insert('tax_minor', 1.5)).rejects.toThrow();
    await expect(insert('subtotal_minor', -1)).rejects.toThrow();
    await expect(insert('extracted_total_minor', 1_000_000_000_000)).rejects.toThrow();
    await expect(insert('receipt_date', '14/05/2025')).rejects.toThrow();
  });
});

describe('receiptRepository', () => {
  it('saves expense, receipt and items together and marks the expense as scanned', async () => {
    const { transaction, created } = await receiptRepository.createWithTransaction(
      await txRecord(),
      receipt(),
      [item(), item({ itemName: null, flags: ['nameUncertain'], lineTotalMinor: 5_600 })],
    );
    expect(created).toBe(true);
    expect(transaction).toMatchObject({ amountMinor: 46_300, hasReceipt: true });

    const stored = await receiptRepository.getByTransactionId(transaction.id);
    expect(stored).toMatchObject({
      vendorName: 'FRESH MART',
      roundOffMinor: -58,
      imageFile: 'draft-1.jpg',
    });
    expect(stored?.items.map((i) => [i.position, i.itemName, i.flags])).toEqual([
      [0, 'Basmati Rice', []],
      [1, null, ['nameUncertain']],
    ]);

    const plain = await transactionRepository.insertAndGet(await txRecord());
    expect(plain.hasReceipt).toBe(false);
  });

  it('returns the first expense when the same draft is saved twice (no duplicate)', async () => {
    const first = await receiptRepository.createWithTransaction(await txRecord(), receipt(), [
      item(),
    ]);
    const second = await receiptRepository.createWithTransaction(await txRecord(), receipt(), [
      item(),
    ]);
    expect(second.created).toBe(false);
    expect(second.transaction.id).toBe(first.transaction.id);
    expect(await count('transactions')).toBe(1);
    expect(await count('receipt_items')).toBe(1);
  });

  it('writes nothing when any part of the save fails', async () => {
    await expect(
      receiptRepository.createWithTransaction(await txRecord(), receipt(), [
        item(),
        item({ lineTotalMinor: 1.5 }),
      ]),
    ).rejects.toThrow();
    expect(await count('transactions')).toBe(0);
    expect(await count('receipts')).toBe(0);
    expect(await count('receipt_items')).toBe(0);
  });

  it('deletes receipt and items with the expense (cascade)', async () => {
    const { transaction } = await receiptRepository.createWithTransaction(
      await txRecord(),
      receipt(),
      [item()],
    );
    await transactionRepository.remove(transaction.id);
    expect(await count('receipts')).toBe(0);
    expect(await count('receipt_items')).toBe(0);
  });

  it('removes only the attachment and reports its image file', async () => {
    const { transaction } = await receiptRepository.createWithTransaction(
      await txRecord(),
      receipt(),
      [item()],
    );
    expect(await receiptRepository.removeByTransactionId(transaction.id)).toEqual({
      imageFile: 'draft-1.jpg',
    });
    expect(await receiptRepository.removeByTransactionId(transaction.id)).toBeUndefined();
    expect((await transactionRepository.getById(transaction.id))?.hasReceipt).toBe(false);
    expect(await count('receipt_items')).toBe(0);
  });

  it('updates details and replaces item rows', async () => {
    const { transaction } = await receiptRepository.createWithTransaction(
      await txRecord(),
      receipt(),
      [item(), item()],
    );
    const saved = await receiptRepository.getByTransactionId(transaction.id);
    const ok = await receiptRepository.updateDetails(saved!.id, {
      vendorName: 'Fresh Mart Ltd',
      receiptNumber: null,
      receiptDate: '2025-05-13',
      items: [item({ itemName: 'Rice', userCorrected: true })],
    });
    expect(ok).toBe(true);
    const updated = await receiptRepository.getByTransactionId(transaction.id);
    expect(updated).toMatchObject({ vendorName: 'Fresh Mart Ltd', receiptNumber: null });
    expect(updated?.items.map((i) => [i.itemName, i.userCorrected])).toEqual([['Rice', true]]);
    expect(await receiptRepository.updateDetails(9999, { ...updated!, items: [] })).toBe(false);
  });

  it('lists image files and finds a similar saved receipt', async () => {
    await receiptRepository.createWithTransaction(await txRecord(), receipt(), []);
    await receiptRepository.createWithTransaction(
      await txRecord({ amountMinor: 100 }),
      receipt({ saveKey: 'draft-2', imageFile: null }),
      [],
    );
    expect(await receiptRepository.listImageFiles()).toEqual(['draft-1.jpg']);
    expect(await receiptRepository.findSimilar('2025-05-14', 46_300)).not.toBeNull();
    expect(await receiptRepository.findSimilar('2025-05-15', 46_300)).toBeNull();
  });

  it('is cleared with all user data (receipts are not part of backups)', async () => {
    await receiptRepository.createWithTransaction(await txRecord(), receipt(), [item()]);
    await dataRepository.clearUserData();
    expect(await count('receipts')).toBe(0);
    expect(await count('receipt_items')).toBe(0);
  });
});
