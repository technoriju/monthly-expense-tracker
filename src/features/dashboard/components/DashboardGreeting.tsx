import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { ProfileAvatar } from '@/features/profile/components/ProfileAvatar';
import { ProfilePhotoSheet } from '@/features/profile/components/ProfilePhotoSheet';
import { useProfileImage } from '@/features/profile/hooks/useProfileImage';
import { useProfileName } from '@/features/profile/hooks/useProfileName';
import { makeStyles, useTheme } from '@/theme';
import { getGreetingKey } from '@/utils/dates';

export function DashboardGreeting({ now }: { now: Date }) {
  const styles = useStyles();
  const { t } = useTranslation('dashboard');
  const { layout } = useTheme();
  const profile = useProfileImage();
  const profileName = useProfileName();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const open = () => {
    setNameDraft(profileName.name);
    setSheetOpen(true);
  };
  /** Closing the sheet (any way) saves the edited name. */
  const close = () => {
    setSheetOpen(false);
    void profileName.save(nameDraft);
  };
  const pick = async () => {
    if (await profile.pick()) close();
  };
  const remove = () => {
    profile.remove();
    close();
  };

  return (
    <View style={styles.root}>
      <View style={styles.text}>
        <AppText variant="heading2" accessibilityRole="header">
          {profileName.name
            ? t('greeting.helloName', { name: profileName.name })
            : t('greeting.hello')}
        </AppText>
        <AppText variant="body" color="textSecondary">
          {t(`greeting.${getGreetingKey(now)}`)}
        </AppText>
      </View>
      <Pressable
        onPress={open}
        // 44pt avatar grown to the 48pt minimum touch target.
        hitSlop={(layout.minTouchTarget - layout.avatarSize) / 2}
        accessibilityRole="button"
        accessibilityLabel={t('profileLabel')}
        accessibilityHint={t('profilePhoto.openHint')}
        style={({ pressed }) => pressed && styles.pressed}>
        <ProfileAvatar uri={profile.uri} />
      </Pressable>
      <ProfilePhotoSheet
        visible={sheetOpen}
        onClose={close}
        uri={profile.uri}
        onPick={() => void pick()}
        onRemove={remove}
        name={nameDraft}
        onNameChange={setNameDraft}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, paddingTop: t.spacing.md },
  text: { flex: 1 },
  pressed: { opacity: t.layout.pressedOpacity },
}));
