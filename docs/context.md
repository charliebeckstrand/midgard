# Expensive-to-Rediscover Context

Non-obvious API contracts, type relationships, and codebase cheat-sheet entries.

## 2026-03-16 — Prop type export pattern in packages/ui

Every component in `packages/ui` exports its props interface from the component's `index.ts` alongside the component itself. The convention is:

```ts
// packages/ui/src/components/input/index.ts
export { Input } from './input'
export type { InputProps } from './input'
```

This applies to all major components: `InputProps`, `TextareaProps`, `SelectProps`, `CheckboxProps`, `SwitchProps`, `RadioProps`, `AvatarProps`, `BadgeProps`, `HeadingProps`, and the page skeletons (`LoginPageProps`, `RegisterPageProps`, `ForgotPasswordPageProps`).

**Why it matters:** Consumers building wrappers (e.g., a `<FormInput>` that adds label/error handling) need the prop type to properly type their own component. Without the export they must use `React.ComponentProps<typeof Input>` or re-declare the shape — both are fragile. Always export the props type when adding a new component.
