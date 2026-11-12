import { budgetRepository, categoryRepository, reportRepository } from '@/database';
import type { Category } from '@/features/categories/types';
import { useSettingsStore } from '@/store/settingsStore';
import { useUiStore } from '@/store/uiStore';
import type { MinorAmount } from '@/types/money';
import { getMonthRange } from '@/utils/dates';

import { buildMonthOverview, toBudgetMonth } from '../calculations';
import { budgetInputSchema } from '../schemas';
import type { Budget, BudgetType, MonthBudgetOverview } from '../types';

export type BudgetErrorCode = 'duplicate' | 'notFound' | 'categoryNotFound' | 'categoryNotExpense';

export class BudgetError extends Error {
  constructor(readonly code: BudgetErrorCode) {
    super(`Budget error: ${code}`);
    this.name = 'BudgetError';
  }
}

export interface CreateBudgetInput {
  budgetType: BudgetType;
  /** Required for category budgets; must be null for the overall budget. */
  categoryId: number | null;
  /** Any date within the budget's month. */
  month: Date;
  amountMinor: MinorAmount;
}

function activeCurrency() {
  return useSettingsStore.getState().currency;
}

function dataChanged(): void {
  useUiStore.getState().bumpDataVersion();
}

/** Categories referenced by the month's budgets or spending, including archived ones. */
async function categoriesFor(
  budgets: readonly Budget[],
  spending: readonly Category[],
): Promise<Map<number, Category>> {
  const byId = new Map(spending.map((c) => [c.id, c]));
  for (const budget of budgets) {
    if (budget.categoryId === null || byId.has(budget.categoryId)) continue;
    const category = await categoryRepository.getById(budget.categoryId);
    if (category) byId.set(category.id, category);
  }
  return byId;
}

/**
 * Budget rules. Spending comes from the same report aggregations as Reports and the
 * Dashboard (expense only, active currency, local month range), so all screens agree.
 */
export const budgetService = {
  async getMonthOverview(month: Date): Promise<MonthBudgetOverview> {
    const currency = activeCurrency();
    const key = toBudgetMonth(month);
    const { from, to } = getMonthRange(month);
    const [budgets, typeRows, categoryRows] = await Promise.all([
      budgetRepository.listByMonth(key, currency),
      reportRepository.getTypeTotals(from, to, currency),
      reportRepository.getCategoryTotals(from, to, currency, 'expense'),
    ]);
    const expenseTotal = typeRows.find((r) => r.type === 'expense')?.totalMinor ?? 0;
    const categories = await categoriesFor(
      budgets,
      categoryRows.map((r) => r.category),
    );
    return buildMonthOverview(key, budgets, expenseTotal, categoryRows, categories);
  },

  /** Creates a budget in the active currency. Throws `duplicate` if one already exists. */
  async create(input: CreateBudgetInput): Promise<Budget> {
    const currency = activeCurrency();
    const { month, amountMinor } = budgetInputSchema.parse({
      month: toBudgetMonth(input.month),
      amountMinor: input.amountMinor,
    });
    const categoryId = input.budgetType === 'overall' ? null : input.categoryId;

    if (input.budgetType === 'category') {
      if (categoryId === null) throw new BudgetError('categoryNotFound');
      const category = await categoryRepository.getById(categoryId);
      if (!category) throw new BudgetError('categoryNotFound');
      if (category.type !== 'expense') throw new BudgetError('categoryNotExpense');
    }
    if (await budgetRepository.find(month, currency, categoryId)) {
      throw new BudgetError('duplicate');
    }

    const id = await budgetRepository.insert({
      budgetType: input.budgetType,
      categoryId,
      amountMinor,
      currency,
      month,
    });
    dataChanged();
    const created = await budgetRepository.getById(id);
    if (!created) throw new BudgetError('notFound');
    return created;
  },

  /** Changes a budget's amount. Month, type and category never change. */
  async updateAmount(id: number, amountMinor: MinorAmount): Promise<void> {
    const valid = budgetInputSchema.shape.amountMinor.parse(amountMinor);
    if (!(await budgetRepository.updateAmount(id, valid))) throw new BudgetError('notFound');
    dataChanged();
  },

  async remove(id: number): Promise<void> {
    if (!(await budgetRepository.remove(id))) throw new BudgetError('notFound');
    dataChanged();
  },
};
