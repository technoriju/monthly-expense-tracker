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
}

/** Bottom sheet with a single name field that creates a custom category. */
export function AddCategorySheet({ visible, onClose, onSubmit, onCreated }: AddCategorySheetProps) {
  const { t } = useTranslation('transactions');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const close = () => {
    setName('');
    setError(undefined);
    onClose();
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const created = await onSubmit(name);
      setName('');
      setError(undefined);
      onCreated(created);
    } catch (e) {
      if (e instanceof CategoryError) {
        setError(t(`addCategory.errors.${e.code}`, { max: CATEGORY_NAME_MAX_LENGTH }));
      } else {
        console.error('Creating category failed', e);
        setError(t('addCategory.errors.failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppSheet
      visible={visible}
      onClose={close}
      title={t('addCategory.title')}
      footer={
        <AppButton
          label={t('addCategory.submit')}
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
