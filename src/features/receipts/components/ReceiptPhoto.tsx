import { Image } from 'expo-image';
import { ImageOff, X } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, AppIconButton, AppText } from '@/components/ui';
import { makeStyles } from '@/theme';

/** Receipt photo thumbnail; tap opens it full screen. Shows a note when the file is gone. */
export function ReceiptPhoto({ uri, missingLabel }: { uri: string | null; missingLabel?: string }) {
  const styles = useStyles();
  const { t } = useTranslation('receipts');
  const [open, setOpen] = useState(false);

  if (uri === null) {
    if (!missingLabel) return null;
    return (
      <View style={styles.missing}>
        <AppIcon icon={ImageOff} color="textMuted" />
        <AppText variant="bodySmall" color="textSecondary" style={styles.flex}>
          {missingLabel}
        </AppText>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={t('review.photoLabel')}
        accessibilityHint={t('review.openPhoto')}
        style={({ pressed }) => [styles.thumb, pressed && styles.pressed]}>
        <Image source={{ uri }} style={styles.fill} contentFit="cover" />
      </Pressable>
      <Modal visible={open} onRequestClose={() => setOpen(false)} animationType="fade">
        <SafeAreaView style={styles.viewer}>
          <View style={styles.close}>
            <AppIconButton
              icon={X}
              onPress={() => setOpen(false)}
              accessibilityLabel={t('review.closePhoto')}
            />
          </View>
          <Image
            source={{ uri }}
            style={styles.flex}
            contentFit="contain"
            accessibilityLabel={t('review.photoLabel')}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  thumb: {
    height: t.layout.receiptThumbHeight,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    backgroundColor: t.colors.surfaceMuted,
  },
  pressed: { opacity: t.layout.pressedOpacity },
  missing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surfaceMuted,
  },
  viewer: { flex: 1, backgroundColor: t.colors.background },
  close: { alignItems: 'flex-end', paddingHorizontal: t.spacing.md },
}));
