import { X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { makeStyles, useTheme } from '@/theme';

import { AppIconButton } from './AppIconButton';
import { AppText } from './AppText';

export interface AppSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Already-translated title. */
  title: string;
  children: ReactNode;
  /** Fixed content below the scroll area (action buttons). */
  footer?: ReactNode;
}

/** Bottom sheet modal: backdrop, title, close button, scrollable body. */
export function AppSheet({ visible, onClose, title, children, footer }: AppSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { layout, spacing } = useTheme();
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* Lifts the sheet above the keyboard. 'padding' on Android too: with edge-to-edge the
          window no longer resizes for the keyboard. */}
      <KeyboardAvoidingView behavior="padding" style={styles.backdrop}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('actions.close')}
        />
        <View
          style={[styles.sheet, { maxHeight: height * layout.sheetMaxHeightRatio }]}
          accessibilityViewIsModal>
          <View style={styles.header}>
            <AppText variant="heading3" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <AppIconButton icon={X} onPress={onClose} accessibilityLabel={t('actions.close')} />
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
              {footer}
            </View>
          ) : (
            <View style={{ height: insets.bottom }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  backdrop: { flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: t.radius.xxl,
    borderTopRightRadius: t.radius.xxl,
    paddingTop: t.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    paddingStart: t.layout.screenGutter,
    paddingEnd: t.spacing.sm,
  },
  title: { flex: 1 },
  body: {
    paddingHorizontal: t.layout.screenGutter,
    paddingBottom: t.spacing.lg,
    gap: t.spacing.lg,
  },
  footer: {
    gap: t.spacing.md,
    paddingHorizontal: t.layout.screenGutter,
    paddingTop: t.spacing.md,
    borderTopWidth: t.layout.hairline,
    borderTopColor: t.colors.border,
  },
}));
