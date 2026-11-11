import { Check, LayoutGrid, Search } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppIcon, AppInput, AppSheet, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useCategoryName } from '../hooks/useCategoryName';
import type { Category } from '../types';
import { CategoryIcon } from './CategoryIcon';

export interface CategoryPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Only compatible categories should be passed (already filtered by type). */
  categories: readonly Category[];
  selectedId: number | null;
  /** `null` = "All categories". */
  onSelect: (categoryId: number | null) => void;
}

/** Searchable single-choice category list used by the history filter. */
export function CategoryPickerSheet({
  visible,
  onClose,
  categories,
  selectedId,
  onSelect,
}: CategoryPickerSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const nameOf = useCategoryName();
  const [query, setQuery] = useState('');

  const needle = query.trim().toLocaleLowerCase();
  const visibleCategories = needle
    ? categories.filter((c) => nameOf(c).toLocaleLowerCase().includes(needle))
    : categories;

  const choose = (id: number | null) => {
    onSelect(id);
    setQuery('');
    onClose();
  };

  return (
    <AppSheet visible={visible} onClose={onClose} title={t('categoryPicker.title')}>
      <AppInput
        label={t('categoryPicker.searchPlaceholder')}
        labelHidden
        placeholder={t('categoryPicker.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
        prefix={<AppIcon icon={Search} size="md" color="textMuted" />}
        returnKeyType="search"
        autoCorrect={false}
      />
      <View accessibilityRole="radiogroup">
        {needle ? null : (
          <Option
            selected={selectedId === null}
            label={t('history.allCategories')}
            onPress={() => choose(null)}
            leading={
              <View style={styles.allIcon}>
                <AppIcon icon={LayoutGrid} size="md" color="primary" />
              </View>
            }
          />
        )}
        {visibleCategories.map((category) => (
          <Option
            key={category.id}
            selected={category.id === selectedId}
            label={nameOf(category)}
            onPress={() => choose(category.id)}
            leading={<CategoryIcon category={category} />}
          />
        ))}
        {visibleCategories.length === 0 ? (
          <AppText variant="body" color="textSecondary" align="center" style={styles.empty}>
            {t('categoryPicker.empty')}
          </AppText>
        ) : null}
      </View>
    </AppSheet>
  );
}

function Option({
  selected,
  label,
  onPress,
  leading,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
  leading: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
      {leading}
      <AppText variant="bodyMedium" style={styles.label} numberOfLines={2}>
        {label}
      </AppText>
      {selected ? <AppIcon icon={Check} size="md" color="primary" /> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.layout.minTouchTarget,
    paddingVertical: t.spacing.sm,
  },
  label: { flex: 1 },
  pressed: { opacity: t.layout.pressedOpacity },
  allIcon: {
    width: t.layout.categoryIconSize,
    height: t.layout.categoryIconSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { paddingVertical: t.spacing.xl },
}));
