import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/ui';
import { makeStyles } from '@/theme';

export interface ProfileAvatarProps {
  uri: string | null;
  /** `lg` is used in the profile photo sheet. */
  size?: 'md' | 'lg';
}

/** Round profile photo, or the default person icon when there is none (or it fails to load). */
export function ProfileAvatar({ uri, size = 'md' }: ProfileAvatarProps) {
  const styles = useStyles();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const frame = size === 'lg' ? styles.large : styles.medium;

  return (
    <View style={[styles.root, frame]}>
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={frame}
          contentFit="cover"
          onError={() => setFailedUri(uri)}
          accessibilityIgnoresInvertColors
          testID="profile-photo"
        />
      ) : (
        <AppIcon icon={User} size={size === 'lg' ? 'xxl' : 'lg'} color="primary" />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  root: {
    backgroundColor: t.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  medium: {
    width: t.layout.avatarSize,
    height: t.layout.avatarSize,
    borderRadius: t.radius.pill,
  },
  large: {
    width: t.layout.avatarLargeSize,
    height: t.layout.avatarLargeSize,
    borderRadius: t.radius.pill,
  },
}));
