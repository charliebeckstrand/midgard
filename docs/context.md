# Expensive-to-Rediscover Context

Non-obvious API contracts, type relationships, and codebase cheat-sheet entries.

## 2026-03-16 — Vercel Geist dark P3 color scale structure

The color palette uses Vercel's Geist dark P3 OKLCH values with a 100-1000 scale. The scale is **not** a smooth gradient — it has a specific structure:

- **100-500**: Dark background tints (oklch ~22-42% lightness)
- **600**: The primary vivid accent shade. Color aliases (e.g., `--color-blue`) point here.
- **700**: A second vivid shade, sometimes brighter than 600 (e.g., amber-700 > amber-600)
- **800**: Darker vivid shade. Used for borders, darker accents.
- **900**: Light shade (oklch ~70-77%). Used for text on dark backgrounds, light icons.
- **1000**: Very light, near-white tint (oklch ~95-97%). Used for lightest text, backgrounds.

Color usage in components:
- Focus rings/outlines: `blue-600`
- Error text: `red-600`; error borders: `red-600` (light), `red-700` (dark)
- Badge pattern: `bg-{color}-600/15 text-{color}-800 dark:text-{color}-900`
- Button bg: `{color}-600` (or `{color}-700` for lighter colors like amber, pink)
- Amber is the exception — text on amber uses dark shades (100), icons use shade 500

## 2026-03-16 — Prop type export pattern in packages/ui

Every component in `packages/ui` exports its props interface from the component's `index.ts` alongside the component itself. The convention is:

```ts
// packages/ui/src/components/input/index.ts
export { Input } from './input'
export type { InputProps } from './input'
```

This applies to all major components: `InputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `SwitchProps`, `RadioProps`, `AvatarProps`, `BadgeProps`, `HeadingProps`, and the page skeletons (`LoginPageProps`, `RegisterPageProps`, `ForgotPasswordPageProps`).

**Why it matters:** Consumers building wrappers (e.g., a `<FormInput>` that adds label/error handling) need the prop type to properly type their own component. Without the export they must use `React.ComponentProps<typeof Input>` or re-declare the shape — both are fragile. Always export the props type when adding a new component.
