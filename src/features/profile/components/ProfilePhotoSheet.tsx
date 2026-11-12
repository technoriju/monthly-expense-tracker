import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppSheet } from '@/components/ui';
import { makeStyles } from '@/theme';

import { ProfileAvatar } from './ProfileAvatar';

export interface ProfilePhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
}

/** Preview of the profile photo with choose / remove actions. */
export function ProfilePhotoSheet({
  visible,
  onClose,
  uri,
  onPick,
  onRemove,
}: ProfilePhotoSheetProps) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');

  const footer = (
    <>
      <AppButton
        label={uri ? t('profilePhoto.change') : t('profilePhoto.choose')}
        icon={ImagePlus}
        onPress={onPick}
        fullWidth
      />
      {uri ? (
        <AppButton
          label={t('profilePhoto.remove')}
          icon={Trash2}
          variant="danger"
          onPress={onRemove}
          fullWidth
        />
      ) : null}
    </>
  );

  return (
    <AppSheet visible={visible} onClose={onClose} title={t('profilePhoto.title')} footer={footer}>
      <View style={styles.preview}>
        <ProfileAvatar uri={uri} size="lg" />
      </View>
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  preview: { alignItems: 'center', paddingVertical: t.spacing.md },
}));
