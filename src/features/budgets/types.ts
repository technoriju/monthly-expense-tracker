import type { Category } from '@/features/categories/types';
import type { CurrencyCode, MinorAmount } from '@/types/money';

export type BudgetType = 'overall' | 'category';

/** Calendar month 'YYYY-MM'. */
export type BudgetMonth = string;

export interface Budget {
  id: number;
  budgetType: BudgetType;
  /** Null for the overall budget. */
  categoryId: number | null;
  /** Integer minor units (paise). Always > 0. */
  amountMinor: MinorAmount;
  currency: CurrencyCode;
  month: BudgetMonth;
  createdAt: number;
  updatedAt: number;
}

/** Fields the repository persists on insert. */
export interface BudgetRecord {
  budgetType: BudgetType;
  categoryId: number | null;
  amountMinor: MinorAmount;
  currency: CurrencyCode;
  month: BudgetMonth;
}

/** `none` = no budget set. Thresholds: < 80% within, 80–<100% approaching, ≥ 100% exceeded. */
export type BudgetStatus = 'none' | 'within' | 'approaching' | 'exceeded';

/** Highest warning threshold reached (percent of budget). */
export type AlertLevel = 80 | 90 | 100;

export interface BudgetProgress {
  /** Budget amount, or null when no budget is set. */
  budgetMinor: MinorAmount | null;
  /** Expense spending in the month (income never counts). */
  spentMinor: MinorAmount;
  /** budget − spent; negative when exceeded; null without a budget. */
  remainingMinor: MinorAmount | null;
  /** Whole percent of the budget used (floored, uncapped); null without a budget. */
  percent: number | null;
  status: BudgetStatus;
  alertLevel: AlertLevel | null;
}

export interface CategoryBudgetProgress {
  budget: Budget;
  category: Category;
  progress: BudgetProgress;
}

export interface UnbudgetedSpending {
  category: Category;
  spentMinor: MinorAmount;
}

export type BudgetAlert =
  | { kind: 'overall'; budgetId: number; level: AlertLevel; percent: number }
  | { kind: 'category'; budgetId: number; level: AlertLevel; percent: number; category: Category };

export interface MonthBudgetOverview {
  month: BudgetMonth;
  /** Null when no overall budget exists for the month. */
  overallBudget: Budget | null;
  /** Always present: without a budget its status is `none` and it still carries spending. */
  overall: BudgetProgress;
  categories: CategoryBudgetProgress[];
  /** Expense categories with spending but no budget this month, largest first. */
  unbudgeted: UnbudgetedSpending[];
  /** One alert per budget at its highest reached threshold; exceeded first. */
  alerts: BudgetAlert[];
}
