import {
  ChartPie,
  LayoutGrid,
  Mic,
  PlusCircle,
  Settings,
  Target,
  type LucideIcon,
} from 'lucide-react-native';

export type OnboardingSlideId =
  'welcome' | 'add' | 'voice' | 'categories' | 'budgets' | 'reports' | 'settings';

export interface OnboardingSlide {
  id: OnboardingSlideId;
  /** `null` shows the app logo instead of an icon. */
  icon: LucideIcon | null;
}

/** First-launch walkthrough of the app's basics, in order. Texts: `onboarding:slides.<id>`. */
export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  { id: 'welcome', icon: null },
  { id: 'add', icon: PlusCircle },
  { id: 'voice', icon: Mic },
  { id: 'categories', icon: LayoutGrid },
  { id: 'budgets', icon: Target },
  { id: 'reports', icon: ChartPie },
  { id: 'settings', icon: Settings },
];
