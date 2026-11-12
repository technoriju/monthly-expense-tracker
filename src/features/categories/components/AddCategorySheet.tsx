import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton, AppInput, AppSheet } from '@/components/ui';

import { CATEGORY_NAME_MAX_LENGTH, CategoryError } from '../services/categoryService';
import type { Category } from '../types';

export interface AddCategorySheetProps {
  visible: boolean;
  onClose: () => void;
  /** Persists the category (throws `CategoryError` for invalid names). */
  onSubmit: (name: string) => Promise<Category>;
  onCreated: (category: Category) => void;
  /** Prefilled name (renaming). The field resets to it on close. */
  initialName?: string;
  /** Already-translated title and button label; default to the "Add category" texts. */
  title?: string;
  submitLabel?: string;
  /** Already-translated message for an unexpected save failure. */
  failedMessage?: string;
}

/** Bottom sheet with a single name field that creates (or renames) a custom category. */
export function AddCategorySheet({
  visible,
  onClose,
  onSubmit,
  onCreated,
  initialName = '',
  title,
  submitLabel,
  failedMessage,
}: AddCategorySheetProps) {
  const { t } = useTranslation('transactions');
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName(initialName);
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await onSubmit(name);
      setName(initialName);
      setError(undefined);
      onCreated(created);
    } catch (e) {
      if (e instanceof CategoryError) {
        setError(t(`addCategory.errors.${e.code}`, { max: CATEGORY_NAME_MAX_LENGTH }));
      } else {
        console.error('Saving category failed', e);
        setError(failedMessage ?? t('addCategory.errors.failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppSheet
      visible={visible}
      onClose={close}
      title={title ?? t('addCategory.title')}
      footer={
        <AppButton
          label={submitLabel ?? t('addCategory.submit')}
          onPress={() => void submit()}
          loading={saving}
          fullWidth
        />
      }>
      <AppInput
        label={t('addCategory.nameLabel')}
        placeholder={t('addCategory.namePlaceholder')}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError(undefined);
        }}
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void submit()}
        error={error}
      />
    </AppSheet>
  );
}
