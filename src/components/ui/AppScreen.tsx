import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { makeStyles } from '@/theme';

export interface AppScreenProps {
  children: ReactNode;
  /** Fixed content above the scroll area (usually an AppHeader). */
  header?: ReactNode;
  scroll?: boolean;
  /** Safe-area edges. Tab screens omit `bottom` because the tab bar handles it. */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

/** Screen wrapper: background, safe areas, horizontal gutter, optional scrolling. */
export function AppScreen({
  children,
  header,
  scroll = true,
  edges = ['top', 'left', 'right'],
  contentStyle,
}: AppScreenProps) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.root} edges={edges}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  header: { paddingHorizontal: t.layout.screenGutter },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: t.layout.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: t.layout.screenGutter,
    paddingBottom: t.spacing.xxxl,
    gap: t.layout.sectionGap,
  },
}));
