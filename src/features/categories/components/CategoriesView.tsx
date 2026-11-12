import { Plus, Trash2, TriangleAlert } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppEmptyState,
  AppHeader,
  AppIconButton,
  AppLoading,
  AppScreen,
  AppSegmentedControl,
  AppText,
} from '@/components/ui';
import { useUiStore } from '@/store/uiStore';
import { makeStyles } from '@/theme';
import type { TransactionType } from '@/types/money';

import { useCategoryName } from '../hooks/useCategoryName';
import { useManageCategories } from '../hooks/useManageCategories';
import type { Category } from '../types';
import { AddCategorySheet } from './AddCategorySheet';
import { CategoryIcon } from './CategoryIcon';

/** Lists categories per type; user-created ones can be added and deleted. */
export function CategoriesView() {
  const { t } = useTranslation('transactions');
  const styles = useStyles();
  const nameOf = useCategoryName();
  const showToast = useUiStore((s) => s.showToast);
  const [type, setType] = useState<TransactionType>('expense');
  const [addOpen, setAddOpen] = useState(false);
  const { categories, loading, error, retry, addCategory, deleteCategory } =
    useManageCategories(type);

  const custom = categories.filter((c) => !c.isDefault);
  const system = categories.filter((c) => c.isDefault);

  const confirmDelete = (category: Category) => {
    const name = nameOf(category);
    Alert.alert(
      t('manageCategories.deleteTitle', { name }),
      t('manageCategories.deleteMessage'),
      [
        { text: t('manageCategories.cancel'), style: 'cancel' },
        {
          text: t('manageCategories.delete'),
          style: 'destructive',
          onPress: () => {
            deleteCategory(category.id)
              .then(() => showToast(t('manageCategories.deleted')))
              .catch((e: unknown) => {
                console.error('Deleting category failed', e);
                showToast(t('manageCategories.deleteFailed'), 'error');
              });
          },
        },
      ],
    );
  };

  const renderList = (items: readonly Category[], deletable: boolean) => (
    <AppCard padding="lg" style={styles.card}>
      {items.map((category, i) => (
        <Fragment key={category.id}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <CategoryIcon category={category} />
            <AppText variant="body" style={styles.name}>
              {nameOf(category)}
            </AppText>
            {deletable ? (
              <AppIconButton
                icon={Trash2}
                size="md"
                color="expenseText"
                accessibilityLabel={t('manageCategories.deleteLabel', { name: nameOf(category) })}
                onPress={() => confirmDelete(category)}
              />
            ) : null}
          </View>
        </Fragment>
      ))}
    </AppCard>
  );

  return (
    <AppScreen
      header={
        <AppHeader
          title={t('manageCategories.title')}
          back
          right={
            <AppIconButton
              icon={Plus}
              accessibilityLabel={t('addCategory.title')}
              onPress={() => setAddOpen(true)}
            />
          }
        />
      }
      edges={['top', 'left', 'right', 'bottom']}>
      <AppSegmentedControl
        options={[
          { value: 'expense', label: t('type.expense') },
          { value: 'income', label: t('type.income') },
        ]}
        value={type}
        onChange={setType}
        accessibilityLabel={t('type.label')}
      />

      {loading ? (
        <AppLoading />
      ) : error ? (
        <AppEmptyState
          icon={TriangleAlert}
          tone="error"
          title={t('formErrors.categoriesFailed')}
          action={{ label: t('formErrors.retry'), onPress: retry }}
        />
      ) : (
        <>
          <View style={styles.section}>
            <AppText variant="bodySmall" color="textSecondary" accessibilityRole="header">
              {t('manageCategories.custom')}
            </AppText>
            {custom.length > 0 ? (
              renderList(custom, true)
            ) : (
              <AppCard padding="lg" style={styles.empty}>
                <AppText variant="bodySmall" color="textSecondary">
                  {t('manageCategories.customEmpty')}
                </AppText>
                <AppButton
                  label={t('addCategory.title')}
                  icon={Plus}
                  variant="secondary"
                  onPress={() => setAddOpen(true)}
                />
              </AppCard>
            )}
          </View>
          <View style={styles.section}>
            <AppText variant="bodySmall" color="textSecondary" accessibilityRole="header">
              {t('manageCategories.default')}
            </AppText>
            {renderList(system, false)}
          </View>
        </>
      )}

      <AddCategorySheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={addCategory}
        onCreated={() => {
          setAddOpen(false);
          showToast(t('manageCategories.added'));
        }}
      />
    </AppScreen>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.sm },
  card: { paddingVertical: t.spacing.xs },
  divider: { height: t.layout.hairline, backgroundColor: t.colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.layout.minTouchTarget,
    paddingVertical: t.spacing.sm,
  },
  name: { flex: 1 },
  empty: { gap: t.spacing.md, alignItems: 'flex-start' },
}));
