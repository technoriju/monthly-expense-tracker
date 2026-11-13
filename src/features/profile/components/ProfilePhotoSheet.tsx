import { ImagePlus, Trash2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppButton, AppInput, AppSheet } from '@/components/ui';
import { PROFILE_NAME_MAX_LENGTH } from '@/features/settings/types';
import { makeStyles } from '@/theme';

import { ProfileAvatar } from './ProfileAvatar';

export interface ProfilePhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
  /** Greeting name being edited (saved by the caller when the sheet closes). */
  name: string;
  onNameChange: (name: string) => void;
}

/** Preview of the profile photo with choose / remove actions, plus the greeting name. */
export function ProfilePhotoSheet({
  visible,
  onClose,
  uri,
  onPick,
  onRemove,
  name,
  onNameChange,
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
      <AppInput
        label={t('profilePhoto.nameLabel')}
        helperText={t('profilePhoto.nameHelper')}
        value={name}
        onChangeText={onNameChange}
        maxLength={PROFILE_NAME_MAX_LENGTH}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={onClose}
      />
    </AppSheet>
  );
}

const useStyles = makeStyles((t) => ({
  preview: { alignItems: 'center', paddingVertical: t.spacing.md },
}));
