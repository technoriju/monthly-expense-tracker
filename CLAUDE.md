# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project: Monthly Expense Tracker

Offline-first income/expense tracker for Android + iOS with manual and voice entry, monthly reports, and English + 22 Indian languages.

**Read first:** `docs/ARCHITECTURE.md` (decisions), `docs/ROADMAP.md` (current phase + scope), `AGENTS.md` (Expo rules). Before any UI work also read `docs/design.md` and view `docs/design-reference.png`.

### Stack
Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router (routes in `src/app/`) · expo-sqlite · Zustand · React Hook Form + Zod · i18next/react-i18next + expo-localization · lucide-react-native + react-native-svg · date-fns.

### Commands
```bash
npx expo install <pkg>   # only way to add dependencies
npx expo start
npx tsc --noEmit
npx expo lint
npx jest
```

### Rules
- **Phase discipline:** work only on the current phase in `docs/ROADMAP.md`. Do not implement later phases early.
- **Layering:** route screen → feature hook → feature service → repository → SQLite. No SQL outside `src/database/`. Screens never import repositories.
- **Money** is integer minor units (`amount_minor`). Never floats. Format only at display time.
- **Dates:** transactions use local `YYYY-MM-DD` strings.
- **Strings:** every user-facing string is a typed i18n key. Never translate category keys or DB values.
- **UI language and voice language are separate settings.**
- **Styling:** tokens from `src/theme` only — no raw hex colors, font sizes, or magic spacing in `src/app` or `src/features`. Do not redesign; match `docs/design-reference.png`.
- **Voice:** parsed entries always go through the Review screen; voice never writes to the DB directly.
- `.tsx` for components, `.ts` for everything else. No `any` without a justification comment.
- Ask before destructive operations (deleting files, removing deps, wiping data).
- Never claim tests/lint/typecheck passed unless actually run in this session.
