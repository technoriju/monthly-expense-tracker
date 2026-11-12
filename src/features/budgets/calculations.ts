import type { CategoryTotalRow } from '@/features/reports/types';
import type { MinorAmount } from '@/types/money';
import { fromIsoDate, toIsoDate } from '@/utils/dates';

import { BUDGET_MONTH_PATTERN } from './schemas';

import type {
  AlertLevel,
  Budget,
  BudgetAlert,
  BudgetMonth,
  BudgetProgress,
  BudgetStatus,
  CategoryBudgetProgress,
  MonthBudgetOverview,
} from './types';

/** Warning thresholds in whole percent, highest first. */
export const ALERT_LEVELS: readonly AlertLevel[] = [100, 90, 80];
export const APPROACHING_PERCENT = 80;
export const EXCEEDED_PERCENT = 100;

/** 'YYYY-MM' of a date's local calendar month. */
export function toBudgetMonth(date: Date): BudgetMonth {
  return toIsoDate(date).slice(0, 7);
}

/** First day of a 'YYYY-MM' month, or null when the text is not a valid month. */
export function parseBudgetMonth(month: string): Date | null {
  return BUDGET_MONTH_PATTERN.test(month) ? fromIsoDate(`${month}-01`) : null;
}

/**
 * True when `spent` is at least `percent`% of `budget`. Integer cross-multiplication —
 * no division, no floats (amounts stay far below 2^53 / 100).
 */
function reaches(spent: MinorAmount, budget: MinorAmount, percent: number): boolean {
  return spent * 100 >= budget * percent;
}

/** Status for spending against a budget. A missing or non-positive budget is `none`. */
export function budgetStatus(budget: MinorAmount | null, spent: MinorAmount): BudgetStatus {
  if (budget === null || budget <= 0) return 'none';
  if (reaches(spent, budget, EXCEEDED_PERCENT)) return 'exceeded';
  if (reaches(spent, budget, APPROACHING_PERCENT)) return 'approaching';
  return 'within';
}

/** Highest warning threshold reached, or null below 80% / without a budget. */
export function alertLevel(budget: MinorAmount | null, spent: MinorAmount): AlertLevel | null {
  if (budget === null || budget <= 0) return null;
  return ALERT_LEVELS.find((level) => reaches(spent, budget, level)) ?? null;
}

/** Whole percent used, floored (99.9% shows as 99, never as a premature 100). Uncapped. */
export function percentUsed(budget: MinorAmount | null, spent: MinorAmount): number | null {
  if (budget === null || budget <= 0) return null;
  return Math.floor((spent * 100) / budget);
}

export function budgetProgress(budget: MinorAmount | null, spent: MinorAmount): BudgetProgress {
  const valid = budget !== null && budget > 0 ? budget : null;
  return {
    budgetMinor: valid,
    spentMinor: spent,
    remainingMinor: valid === null ? null : valid - spent,
    percent: percentUsed(valid, spent),
    status: budgetStatus(valid, spent),
    alertLevel: alertLevel(valid, spent),
  };
}

/** One alert per budget (its highest threshold), exceeded first, then by percent used. */
export function collectAlerts(
  overallBudget: Budget | null,
  overall: BudgetProgress,
  categories: readonly CategoryBudgetProgress[],
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  if (overallBudget && overall.alertLevel !== null && overall.percent !== null) {
    alerts.push({
      kind: 'overall',
      budgetId: overallBudget.id,
      level: overall.alertLevel,
      percent: overall.percent,
    });
  }
  for (const item of categories) {
    const { alertLevel: level, percent } = item.progress;
    if (level !== null && percent !== null) {
      alerts.push({
        kind: 'category',
        budgetId: item.budget.id,
        level,
        percent,
        category: item.category,
      });
    }
  }
  return alerts.sort(
    (a, b) =>
      b.level - a.level ||
      b.percent - a.percent ||
      (a.kind === b.kind ? 0 : a.kind === 'overall' ? -1 : 1),
  );
}

/**
 * Combines a month's budgets with its expense totals (from the report aggregations).
 * Category budgets whose category has no spending show 0 spent. Categories with
 * spending but no budget are listed in `unbudgeted` so they stay visible.
 */
export function buildMonthOverview(
  month: BudgetMonth,
  budgets: readonly Budget[],
  expenseTotalMinor: MinorAmount,
  expenseByCategory: readonly CategoryTotalRow[],
  categoriesById: ReadonlyMap<number, CategoryBudgetProgress['category']>,
): MonthBudgetOverview {
  const spentByCategory = new Map(expenseByCategory.map((r) => [r.category.id, r.totalMinor]));
  const overallBudget = budgets.find((b) => b.budgetType === 'overall') ?? null;
  const overall = budgetProgress(overallBudget?.amountMinor ?? null, expenseTotalMinor);

  const categories: CategoryBudgetProgress[] = [];
  for (const budget of budgets) {
    if (budget.budgetType !== 'category' || budget.categoryId === null) continue;
    const category = categoriesById.get(budget.categoryId);
    if (!category) continue;
    categories.push({
      budget,
      category,
      progress: budgetProgress(budget.amountMinor, spentByCategory.get(budget.categoryId) ?? 0),
    });
  }
  categories.sort(
    (a, b) =>
      (b.progress.percent ?? 0) - (a.progress.percent ?? 0) ||
      a.category.sortOrder - b.category.sortOrder ||
      a.category.id - b.category.id,
  );

  const budgeted = new Set(categories.map((c) => c.category.id));
  const unbudgeted = expenseByCategory
    .filter((r) => !budgeted.has(r.category.id) && r.totalMinor > 0)
    .map((r) => ({ category: r.category, spentMinor: r.totalMinor }));

  return {
    month,
    overallBudget,
    overall,
    categories,
    unbudgeted,
    alerts: collectAlerts(overallBudget, overall, categories),
  };
}
