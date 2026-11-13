import { categoryRepository } from '@/database';
import {
  createMigratedTestDatabase,
  type TestDatabase,
} from '@/database/testing/createTestDatabase';
import { transactionService } from '@/features/transactions/services/transactionService';
import { useUiStore } from '@/store/uiStore';

import { receiptImageStore } from '../services/receiptImageStore';
import { ReceiptError, receiptService, type ReceiptSaveInput } from '../services/receiptService';

let mockDb: TestDatabase;

jest.mock('@/database/client', () => ({
  getDatabase: async () => mockDb,
}));

jest.mock('../services/receiptImageStore', () => ({
  receiptImageStore: {
    uriOf: jest.fn(),
    delete: jest.fn(),
    sweep: jest.fn(),
    deleteAll: jest.fn(),
  },
}));

const store = jest.mocked(receiptImageStore);

beforeEach(async () => {
  mockDb = await createMigratedTestDatabase();
  store.uriOf.mockReset().mockImplementation((name) => (name ? `file:///receipts/${name}` : null));
  store.delete.mockReset();
  store.sweep.mockReset();
});

afterEach(() => {
  mockDb.close();
});

async function input(overrides: Partial<ReceiptSaveInput> = {}): Promise<ReceiptSaveInput> {
  const food = (await categoryRepository.listAll()).find((c) => c.key === 'food');
  return {
    saveKey: 'draft-abc12345',
    transaction: {
      type: 'expense',
      amountMinor: 45_000,
      categoryId: food!.id,
      occurredOn: '2025-05-14',
      note: null,
      paymentMethod: 'cash',
    },
    details: {
      vendorName: 'Corner Shop',
      receiptNumber: null,
      receiptDate: '2025-05-14',
      items: [
        {
          itemName: null,
          originalOcrName: 'd~/',
          quantityMilli: null,
          unit: null,
          unitPriceMinor: null,
          lineTotalMinor: 45_000,
          nameConfidence: 0.3,
          amountConfidence: 0.9,
          flags: ['nameUncertain'],
          userCorrected: false,
        },
      ],
    },
    extras: {
      originalOcrText: 'Corner Shop\nd~/ 450',
      ocrProvider: 'mlkit',
      extractedTotalMinor: 45_000,
      subtotalMinor: null,
      taxMinor: null,
      discountMinor: null,
      chargesMinor: null,
      roundOffMinor: null,
    },
    imageFile: 'draft-abc12345.jpg',
    ...overrides,
  };
}

describe('receiptService.save', () => {
  it('saves an itemized receipt with an unreadable item name and refreshes data', async () => {
    const before = useUiStore.getState().dataVersion;
    const { transaction, created } = await receiptService.save(await input());
    expect(created).toBe(true);
    expect(transaction).toMatchObject({ amountMinor: 45_000, hasReceipt: true, source: 'manual' });
    expect(useUiStore.getState().dataVersion).toBe(before + 1);

    const view = await receiptService.getForTransaction(transaction.id);
    expect(view?.imageUri).toBe('file:///receipts/draft-abc12345.jpg');
    expect(view?.receipt.items[0]).toMatchObject({ itemName: null, lineTotalMinor: 45_000 });
  });

  it('saves a total-only receipt without items or photo', async () => {
    const base = await input();
    const { transaction } = await receiptService.save({
      ...base,
      details: { ...base.details, items: [] },
      imageFile: null,
    });
    const view = await receiptService.getForTransaction(transaction.id);
    expect(view?.receipt.items).toEqual([]);
    expect(view?.imageUri).toBeNull();
  });

  it('does not create a second expense when the same draft is saved again', async () => {
    const first = await receiptService.save(await input());
    const second = await receiptService.save(await input());
    expect(second).toEqual({ transaction: first.transaction, created: false });
    expect(await transactionService.list({}, { limit: 10, offset: 0 })).toHaveLength(1);
  });

  it('rejects income, invalid amounts and bad keys without writing', async () => {
    const base = await input();
    await expect(
      receiptService.save({ ...base, transaction: { ...base.transaction, type: 'income' } }),
    ).rejects.toEqual(new ReceiptError('notExpense'));
    await expect(
      receiptService.save({ ...base, transaction: { ...base.transaction, amountMinor: 0 } }),
    ).rejects.toThrow();
    await expect(receiptService.save({ ...base, saveKey: '../x' })).rejects.toEqual(
      new ReceiptError('invalid'),
    );
    const badItem = { ...base.details.items[0]!, lineTotalMinor: -5 };
    await expect(
      receiptService.save({ ...base, details: { ...base.details, items: [badItem] } }),
    ).rejects.toEqual(new ReceiptError('invalid'));
    expect(await transactionService.list({}, { limit: 10, offset: 0 })).toEqual([]);
  });

  it('stops when the photo is gone so the user can decide', async () => {
    store.uriOf.mockReturnValue(null);
    await expect(receiptService.save(await input())).rejects.toEqual(
      new ReceiptError('imageMissing'),
    );
    expect(await transactionService.list({}, { limit: 10, offset: 0 })).toEqual([]);
  });

  it('keeps long OCR text by cutting it rather than failing', async () => {
    const base = await input();
    const { transaction } = await receiptService.save({
      ...base,
      extras: { ...base.extras, originalOcrText: 'x'.repeat(50_000) },
    });
    const view = await receiptService.getForTransaction(transaction.id);
    expect(view?.receipt.originalOcrText).toHaveLength(20_000);
  });
});

describe('receipt attachment lifecycle', () => {
  it('removes the attachment and its photo but keeps the expense', async () => {
    const { transaction } = await receiptService.save(await input());
    await receiptService.removeAttachment(transaction.id);
    expect(store.delete).toHaveBeenCalledWith('draft-abc12345.jpg');
    expect((await transactionService.getById(transaction.id))?.hasReceipt).toBe(false);
    await expect(receiptService.removeAttachment(transaction.id)).rejects.toEqual(
      new ReceiptError('notFound'),
    );
  });

  it('deletes the photo when the expense is deleted', async () => {
    const { transaction } = await receiptService.save(await input());
    await transactionService.remove(transaction.id);
    expect(store.delete).toHaveBeenCalledWith('draft-abc12345.jpg');
    expect(await receiptService.getForTransaction(transaction.id)).toBeNull();
  });

  it('keeps the expense deleted even if the photo cannot be removed', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    store.delete.mockImplementation(() => {
      throw new Error('disk');
    });
    const { transaction } = await receiptService.save(await input());
    await expect(transactionService.remove(transaction.id)).resolves.toBeUndefined();
    expect(await transactionService.getById(transaction.id)).toBeNull();
    warn.mockRestore();
  });

  it('sweeps photos not used by any receipt, keeping the open draft', async () => {
    await receiptService.save(await input());
    await receiptService.sweepOrphanImages('draft-open0001.jpg');
    expect(store.sweep).toHaveBeenCalledWith(new Set(['draft-abc12345.jpg', 'draft-open0001.jpg']));
  });

  it('updates details and rejects unknown receipts', async () => {
    const { transaction } = await receiptService.save(await input());
    const view = await receiptService.getForTransaction(transaction.id);
    await receiptService.updateDetails(view!.receipt.id, {
      vendorName: 'Corner Store',
      receiptNumber: 'A-1',
      receiptDate: null,
      items: [],
    });
    expect((await receiptService.getForTransaction(transaction.id))?.receipt).toMatchObject({
      vendorName: 'Corner Store',
      items: [],
    });
    await expect(
      receiptService.updateDetails(999, {
        vendorName: null,
        receiptNumber: null,
        receiptDate: null,
        items: [],
      }),
    ).rejects.toEqual(new ReceiptError('notFound'));
  });
});
