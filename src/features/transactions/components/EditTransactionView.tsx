import { router } from 'expo-router';
import { SearchX, TriangleAlert } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppEmptyState, AppHeader, AppLoading, AppScreen } from '@/components/ui';
import { makeStyles } from '@/theme';

import { useTransaction } from '../hooks/useTransaction';
import { TransactionFormView } from './TransactionFormView';

/** Loads a transaction and shows the edit form, or a graceful not-found / error state. */
export function EditTransactionView({ id }: { id: number }) {
  const styles = useStyles();
  const { t } = useTranslation('transactions');
  const { t: tCommon } = useTranslation();
  const state = useTransaction(id);

  if (state.status === 'ready') {
    return <TransactionFormView mode={{ kind: 'edit', transaction: state.transaction }} />;
  }

  return (
    <AppScreen
      header={<AppHeader title={t('edit.title')} back />}
      scroll={false}
      edges={['top', 'left', 'right', 'bottom']}
      contentStyle={styles.centered}>
      {state.status === 'loading' ? (
        <AppLoading />
      ) : (
        <AppEmptyState
          icon={state.status === 'notFound' ? SearchX : TriangleAlert}
          tone={state.status === 'error' ? 'error' : 'default'}
          title={state.status === 'notFound' ? t('notFound.title') : t('history.error.title')}
          message={state.status === 'notFound' ? t('notFound.message') : t('history.error.message')}
          action={{ label: tCommon('actions.back'), onPress: () => router.back() }}
        />
      )}
    </AppScreen>
  );
}

const useStyles = makeStyles(() => ({
  centered: { justifyContent: 'center' },
}));
