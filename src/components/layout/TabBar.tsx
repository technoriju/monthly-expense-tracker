import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { ChartColumn, House, Menu, Mic, Plus, type LucideIcon } from 'lucide-react-native';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppText } from '@/components/ui';
import { makeStyles, useTheme } from '@/theme';

type TabLabelKey = 'tabs.home' | 'tabs.reports' | 'tabs.voice' | 'tabs.more';

const TABS: Record<string, { icon: LucideIcon; labelKey: TabLabelKey }> = {
  index: { icon: House, labelKey: 'tabs.home' },
  reports: { icon: ChartColumn, labelKey: 'tabs.reports' },
  voice: { icon: Mic, labelKey: 'tabs.voice' },
  more: { icon: Menu, labelKey: 'tabs.more' },
};

/** The raised Add button sits after this many tabs (Home, Reports | + | Voice, More). */
const ADD_BUTTON_POSITION = 2;

/** Custom bottom bar matching design-reference.png: 4 tabs + raised center Add button. */
export function TabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const config = TABS[route.name];
        if (!config) return null;
        const focused = state.index === index;

        const onPress = () => {
          const event = emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigateToTab(route.key);
          }
        };

        return (
          <Fragment key={route.key}>
            {index === ADD_BUTTON_POSITION ? <AddButton /> : null}
            <Pressable
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={t(config.labelKey)}
              style={styles.tab}>
              <AppIcon icon={config.icon} size="lg" color={focused ? 'primary' : 'textMuted'} />
              <AppText
                variant="caption"
                color={focused ? 'primary' : 'textMuted'}
                numberOfLines={1}
                constrainScale>
                {t(config.labelKey)}
              </AppText>
            </Pressable>
          </Fragment>
        );
      })}
    </View>
  );
}

function AddButton() {
  const styles = useStyles();
  const { shadows } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.tab}>
      <Pressable
        onPress={() => router.push('/transaction/new')}
        accessibilityRole="button"
        accessibilityLabel={t('actions.addTransaction')}
        style={({ pressed }) => [styles.addButton, shadows.raised, pressed && styles.addPressed]}>
        <AppIcon icon={Plus} size="xl" color="onPrimary" strokeWidth={2.5} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderTopWidth: t.layout.hairline,
    borderTopColor: t.colors.border,
  },
  tab: {
    flex: 1,
    minHeight: t.layout.tabBarHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
  },
  addButton: {
    width: t.layout.tabBarAddButtonSize,
    height: t.layout.tabBarAddButtonSize,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -t.layout.tabBarAddButtonLift,
  },
  addPressed: { backgroundColor: t.colors.primaryPressed },
}));
