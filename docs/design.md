# Design System — Monthly Expense Tracker

## 1. Design Reference

The visual source of truth for this application is:

`docs/design-reference.png`

This image contains the approved UI reference for:

- Splash screen
- Onboarding
- Dashboard
- Add Transaction
- Voice Entry
- Voice Review
- Reports
- Category Breakdown
- Monthly Calendar
- Settings

### Mandatory Design Instructions

- Treat `docs/design-reference.png` as the primary visual design reference.
- Reproduce its layout, colors, spacing, component shapes, typography hierarchy, and visual style as closely as practical.
- Do not invent a completely different design system.
- Do not replace the approved purple theme with another color.
- Do not introduce unnecessary gradients, glassmorphism, excessive animations, or decorative elements.
- Use the reference image to guide UI implementation.
- If a screen is not shown in the reference, follow the same visual language.
- Maintain consistency across every screen.

## 2. Brand Identity

Application: Monthly Expense Tracker

### Colors

```ts
export const colors = {
  primary: "#5B2ED6",
  primaryDark: "#3D1AA8",
  primaryLight: "#EDE7FF",

  secondary: "#FF9F1C",
  secondaryLight: "#FFF0D9",

  background: "#F7F6FC",
  surface: "#FFFFFF",

  textPrimary: "#17152A",
  textSecondary: "#77758A",
  textMuted: "#A09CB3",

  border: "#E9E5F3",

  income: "#16A34A",
  incomeBackground: "#E9F9EF",

  expense: "#EF4444",
  expenseBackground: "#FFF0F1",

  info: "#2563EB",
  infoBackground: "#EAF2FF",

  chartBlue: "#3568FF",
  chartPurple: "#7C3AED",
  chartOrange: "#FF9F43",
  chartPink: "#D946EF",
  chartCyan: "#22C1D6",
};
```

## 3. Typography

Use a modern, rounded, readable typography system matching the reference.

### Font Family

Use:

- English: Inter
- Bengali: Noto Sans Bengali
- Hindi: Noto Sans Devanagari
- Other Indian scripts: appropriate Noto Sans script fonts

Use Expo-compatible font loading.

### Typography Scale

| Token        | Size | Weight   |
| ------------ | ---: | -------- |
| display      |   32 | Bold     |
| heading1     |   24 | Bold     |
| heading2     |   20 | Bold     |
| heading3     |   18 | SemiBold |
| body         |   15 | Regular  |
| bodyMedium   |   15 | Medium   |
| bodySmall    |   13 | Regular  |
| caption      |   11 | Regular  |
| button       |   14 | SemiBold |
| amountLarge  |   28 | Bold     |
| amountMedium |   20 | Bold     |

Use consistent line heights and appropriate font fallback.

### Typography Rules

- Use bold typography for important financial amounts.
- Use medium weight for section titles.
- Use regular weight for descriptions.
- Avoid excessively small text.
- Support long Bengali and Indian-language text.
- Prevent text clipping and overflow.
- Financial amounts must remain readable.
- Currency symbols must render correctly.
- Typography must adapt to the selected language.

## 4. Spacing System

Use a centralized spacing scale.

```ts
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};
```

## 5. Radius System

```ts
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};
```

## 6. Component Design

### Cards

- White background.
- Rounded corners.
- Soft shadow.
- Subtle border.
- Consistent padding.
- Avoid excessive elevation.

### Buttons

Primary:

- Purple background.
- White text.
- Rounded corners.
- Medium/bold text.
- Minimum height 48.

Secondary:

- Light lavender background.
- Purple text.

Danger:

- Light red background.
- Red text.

### Inputs

- White background.
- Rounded corners.
- Light border.
- Proper focus state.
- Clear error state.
- Accessible labels.
- Appropriate keyboard type.

### Category Icons

- Rounded pastel icon backgrounds.
- Orange, blue, pink, purple, and green accents.
- Use Lucide icons.
- Avoid emoji as permanent category icons.

### Bottom Navigation

- White background.
- Home, Reports, Add, Voice, More.
- Purple active state.
- Muted inactive state.
- Prominent central Add button.
- Safe-area aware.

## 7. Screen Specifications

### Dashboard

- Greeting and profile icon.
- Month selector.
- Income and expense summary cards.
- Remaining balance card.
- Monthly trend chart.
- Recent transactions.
- See All navigation.
- Floating Add button.

### Add Transaction

- Expense/Income segmented control.
- Category grid.
- Amount field.
- Date selector.
- Optional note.
- Save button.

### Voice Entry

- Large circular microphone.
- Listening animation.
- Waveform.
- Bengali/English selection.
- Speech instructions.
- Cancel button.

### Review Voice Entries

- Parsed transaction list.
- Editable category and amount.
- Total amount.
- Save All.
- Edit More.

### Reports

- Monthly income and expense summary.
- Donut chart.
- Category breakdown.
- Expense trend chart.
- Date filters.

### Category Breakdown

- Large donut chart.
- Category list.
- Percentage.
- Total per category.

### Monthly Calendar

- Calendar grid.
- Selected date.
- Daily expense summary.
- Transaction details.

### Settings

- Profile.
- Language.
- Currency.
- Voice preferences.
- Notifications.
- Backup and Restore.
- About.

## 8. Indian Language Support

The application must support Indian languages through a localization architecture.

### Required Languages

- English
- Bengali
- Hindi
- Assamese
- Odia
- Marathi
- Gujarati
- Punjabi
- Tamil
- Telugu
- Kannada
- Malayalam
- Urdu
- Sanskrit
- Konkani
- Manipuri (Meitei)
- Bodo
- Santali
- Kashmiri
- Dogri
- Sindhi

Use proper script-specific fonts and translations.

### Localization Rules

- Never hardcode user-facing strings.
- Use translation keys.
- Store locale preferences locally.
- Support language switching without restarting the application where practical.
- Support regional number formatting.
- Support localized date formats.
- Support localized currency display.
- Keep financial calculations independent of locale.
- Do not translate category IDs or database identifiers.
- Support Bengali and Hindi digits in input parsing.
- Voice recognition language selection must be separate from UI language.

## 9. Responsive Design

- Support Android and iOS.
- Support different screen widths.
- Respect safe areas.
- Use Flexbox.
- Avoid fixed screen dimensions.
- Use ScrollView for long forms.
- Support accessibility font scaling.
- Avoid horizontal overflow.
- Support long localized labels.
- Keep touch targets accessible.

## 10. Design Quality Checklist

Before completing any UI screen:

- Compare with `docs/design-reference.png`.
- Verify color consistency.
- Verify typography hierarchy.
- Verify spacing and padding.
- Verify corner radius.
- Verify button dimensions.
- Verify icon consistency.
- Verify responsive behavior.
- Verify Bengali rendering.
- Verify no text overflow.
- Verify accessibility.
- Verify light theme consistency.

Every screen must follow this design system.
