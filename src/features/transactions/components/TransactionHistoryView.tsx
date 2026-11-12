import { router } from 'expo-router';
import {
  ArrowUpDown,
  CalendarDays,
  Inbox,
  LayoutGrid,
  Search,
  SearchX,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppChip,
  AppEmptyState,
  AppHeader,
  AppIcon,
  AppInput,
  AppLoading,
  AppScreen,
  AppText,
} from '@/components/ui';
import { CategoryPickerSheet } from '@/features/categories/components/CategoryPickerSheet';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useCategoryName } from '@/features/categories/hooks/useCategoryName';
import { useFormatters } from '@/hooks/useFormatters';
import { makeStyles, useTheme } from '@/theme';
import type { TransactionType } from '@/types/money';
import { getRelativeDayKey } from '@/utils/dates';

import type { TransactionDayGroup } from '../grouping';
import { useDeleteTransaction } from '../hooks/useDeleteTransaction';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import type { TransactionSort } from '../types';
import { DateRangeSheet, type DateRange } from './DateRangeSheet';
import { TransactionRow } from './TransactionRow';

export interface TransactionHistoryInitialFilter {
  type?: TransactionType;
  categoryId?: number;
  range?: DateRange;
}

/**
 * "See all" transaction list: search, filters, sort, grouped by date, paginated.
 * `initialFilter` pre-applies filters (e.g. opened from a report category).
 */
export function TransactionHistoryView({
  initialFilter = {},
}: {
  initialFilter?: TransactionHistoryInitialFilter;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useTranslation('transactions');
  const { t: tCommon } = useTranslation();
  const format = useFormatters();
  const nameOf = useCategoryName();
  const confirmDelete = useDeleteTransaction();
  const today = new Date();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TransactionType | undefined>(initialFilter.type);
  const [categoryId, setCategoryId] = useState<number | null>(initialFilter.categoryId ?? null);
  const [range, setRange] = useState<DateRange>(initialFilter.range ?? { from: null, to: null });
  const [sort, setSort] = useState<TransactionSort>('newest');
  const [sheet, setSheet] = useState<'category' | 'date' | null>(null);

  const { categories: allCategories } = useCategories();
  const pickerCategories = useMemo(
    () => (type ? allCategories.filter((c) => c.type === type) : allCategories),
    [allCategories, type],
  );
  const selectedCategory = allCategories.find((c) => c.id === categoryId) ?? null;
  const categoryIds = useMemo(() => (categoryId === null ? undefined : [categoryId]), [categoryId]);

  const history = useTransactionHistory({
    search,
    type,
    categoryIds,
    dateFrom: range.from ?? undefined,
    dateTo: range.to ?? undefined,
    sort,
  });

  const hasFilters =
    search.trim() !== '' ||
    type !== undefined ||
    categoryId !== null ||
    range.from !== null ||
    range.to !== null;

  const changeType = (next: TransactionType | undefined) => {
    setType(next);
    // Prevent an incompatible category filter (e.g. "Salary" while showing expenses).
    if (next && selectedCategory && selectedCategory.type !== next) setCategoryId(null);
  };

  const clearFilters = () => {
    setSearch('');
    setType(undefined);
    setCategoryId(null);
    setRange({ from: null, to: null });
  };

  const dateChipLabel =
    range.from || range.to
      ? [range.from, range.to].map((d) => (d ? format.shortDate(d) : '…')).join(' – ')
      : t('history.anyDate');

  const dayLabel = (date: string) => {
    const relative = getRelativeDayKey(date, today);
    return relative ? tCommon(`date.${relative}`) : format.longDate(date);
  };

  const renderGroup = ({ item }: { item: TransactionDayGroup }) => (
    <View style={styles.group}>
      <AppText variant="bodyMedium" color="textSecondary" accessibilityRole="header">
        {dayLabel(item.date)}
      </AppText>
      <AppCard padding="md">
        {item.transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            today={today}
            showDate={false}
            onPress={() =>
              router.push({ pathname: '/transaction/[id]', params: { id: String(tx.id) } })
            }
            onLongPress={() => confirmDelete(tx)}
            longPressActionLabel={t('delete.label')}
          />
        ))}
      </AppCard>
    </View>
  );

  const listEmpty =
    history.status === 'loading' ? (
      <AppLoading />
    ) : history.status === 'error' ? (
      <AppEmptyState
        icon={TriangleAlert}
        tone="error"
        title={t('history.error.title')}
        message={t('history.error.message')}
        action={{ label: t('history.retry'), onPress: () => void history.retry() }}
      />
    ) : hasFilters ? (
      <AppEmptyState
        icon={SearchX}
        title={t('history.noResults.title')}
        message={t('history.noResults.message')}
        action={{ label: t('history.clearFilters'), onPress: clearFilters }}
      />
    ) : (
      <AppEmptyState
        icon={Inbox}
        title={t('history.empty.title')}
        message={t('history.empty.message')}
      />
    );

  return (
    <AppScreen
      header={<AppHeader title={t('history.title')} back />}
      scroll={false}
      edges={['top', 'left', 'right', 'bottom']}
      contentStyle={styles.content}>
      <View style={styles.controls}>
        <AppInput
          label={t('history.searchLabel')}
          labelHidden
          placeholder={t('history.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          prefix={<AppIcon icon={Search} size="md" color="textMuted" />}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          accessibilityLabel={t('history.filtersLabel')}>
          <AppChip
            label={t('history.all')}
            selected={!type}
            onPress={() => changeType(undefined)}
          />
          <AppChip
            label={t('type.expense')}
            selected={type === 'expense'}
            onPress={() => changeType('expense')}
          />
          <AppChip
            label={t('type.income')}
            selected={type === 'income'}
            onPress={() => changeType('income')}
          />
          <AppChip
            role="button"
            icon={LayoutGrid}
            label={selectedCategory ? nameOf(selectedCategory) : t('history.allCategories')}
            selected={selectedCategory !== null}
            onPress={() => setSheet('category')}
          />
          <AppChip
            role="button"
            icon={CalendarDays}
            label={dateChipLabel}
            selected={range.from !== null || range.to !== null}
            onPress={() => setSheet('date')}
          />
          <AppChip
            role="button"
            icon={ArrowUpDown}
            label={t(`history.sort.${sort}`)}
            onPress={() => setSort(sort === 'newest' ? 'oldest' : 'newest')}
          />
          {hasFilters ? (
            <AppChip
              role="button"
              icon={X}
              label={t('history.clearFilters')}
              onPress={clearFilters}
            />
          ) : null}
        </ScrollView>
      </View>

      <FlatList
        style={styles.list}
        data={history.groups}
        keyExtractor={(group) => group.date}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          history.loadingMore ? (
            <AppLoading />
          ) : history.loadMoreFailed ? (
            <View style={styles.footerError}>
              <AppText variant="bodySmall" color="expenseText" accessibilityRole="alert">
                {t('history.error.title')}
              </AppText>
              <AppButton
                label={t('history.retry')}
                variant="secondary"
                size="sm"
                onPress={() => void history.loadMore(true)}
              />
            </View>
          ) : undefined
        }
        onEndReached={() => void history.loadMore()}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={history.refreshing}
            onRefresh={() => void history.refresh()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      <CategoryPickerSheet
        visible={sheet === 'category'}
        onClose={() => setSheet(null)}
        categories={pickerCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
      />
      <DateRangeSheet
        visible={sheet === 'date'}
        onClose={() => setSheet(null)}
        value={range}
        onApply={setRange}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  content: { paddingBottom: 0, gap: t.spacing.md },
  controls: { gap: t.spacing.md },
  chips: { gap: t.spacing.sm, paddingVertical: t.spacing.xs },
  list: { flex: 1 },
  listContent: { flexGrow: 1, gap: t.spacing.lg, paddingBottom: t.spacing.xxxl },
  group: { gap: t.spacing.sm },
  footerError: { gap: t.spacing.sm, alignItems: 'center', paddingVertical: t.spacing.md },
}));
