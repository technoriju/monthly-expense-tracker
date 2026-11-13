import { Plus } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { makeStyles } from '@/theme';
import type { TransactionType } from '@/types/money';

import { useCategoryName } from '../hooks/useCategoryName';
import { splitQuickCategories } from '../quickCategories';
import type { Category } from '../types';
import { AddCategorySheet } from './AddCategorySheet';
import { CategoryCell, useCellStyles } from './CategoryGrid';
import { CategoryIcon } from './CategoryIcon';
import { CategoryPickerSheet } from './CategoryPickerSheet';

export interface CategoryQuickPickerProps {
  type: TransactionType;
  /** Active categories of `type`, most used first. */
  categories: readonly Category[];
  selectedId: number | null;
  onSelect: (categoryId: number) => void;
  /** Creates a custom category. Omit to hide the "Add category" tile (budget editor). */
  onAddCategory?: (name: string) => Promise<Category>;
  /** Already-translated name of the group (screen-reader label). */
  accessibilityLabel: string;
}

/**
 * Two-row category grid for the transaction form: the 6 most used categories, then an
 * "Other" tile (opens a searchable list of every category) and an "Add category" tile.
 * A selection outside the 6 is shown in place of "Other". Without `onAddCategory` the "Add"
 * tile is left out. When "Other" itself is not in `categories` (e.g. it already has a budget),
 * the first category outside the 6 stands in for it so the rest stay reachable.
 */
export function CategoryQuickPicker({
  type,
  categories,
  selectedId,
  onSelect,
  onAddCategory,
  accessibilityLabel,
}: CategoryQuickPickerProps) {
  const cellStyles = useCellStyles();
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const nameOf = useCategoryName();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const split = splitQuickCategories(categories, type);
  const { quick } = split;
  const other = split.other ?? categories.find((c) => !quick.includes(c)) ?? null;
  const inQuick = quick.some((c) => c.id === selectedId);
  const selectedElsewhere =
    selectedId !== null && !inQuick ? categories.find((c) => c.id === selectedId) : undefined;
  /** The third tile of row 2: "Other", or the category chosen from its list. */
  const otherTile = selectedElsewhere ?? other;
  // "Other" first in the list, then every other category.
  const pickerCategories = other ? [other, ...categories.filter((c) => c !== other)] : categories;

  const openOther = () => {
    // Default to "Other" unless a category from the list is already chosen.
    if (other && (selectedId === null || inQuick)) onSelect(other.id);
    setPickerOpen(true);
  };

  return (
    <>
      <View
        style={cellStyles.grid}
        accessibilityRole="radiogroup"
        accessibilityLabel={accessibilityLabel}>
        {quick.map((category) => (
          <CategoryCell
            key={category.id}
            icon={<CategoryIcon category={category} />}
            label={nameOf(category)}
            selected={category.id === selectedId}
            onPress={() => onSelect(category.id)}
          />
        ))}
        {otherTile ? (
          <CategoryCell
            icon={<CategoryIcon category={otherTile} />}
            label={nameOf(otherTile)}
            selected={otherTile.id === selectedId}
            onPress={openOther}
            accessibilityHint={t('quickCategories.otherHint')}
          />
        ) : null}
        {onAddCategory ? (
          <CategoryCell
            icon={
              <View style={styles.addIcon}>
                <AppIcon icon={Plus} size="md" color="primary" />
              </View>
            }
            label={t('quickCategories.add')}
            onPress={() => setAddOpen(true)}
          />
        ) : null}
      </View>

      <CategoryPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        categories={pickerCategories}
        selectedId={selectedId}
        includeAll={false}
        onSelect={(id) => {
          if (id !== null) onSelect(id);
        }}
      />

      {onAddCategory ? (
        <AddCategorySheet
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onSubmit={onAddCategory}
          onCreated={(category) => {
            setAddOpen(false);
            onSelect(category.id);
          }}
        />
      ) : null}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  addIcon: {
    width: t.layout.categoryIconSize,
    height: t.layout.categoryIconSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
