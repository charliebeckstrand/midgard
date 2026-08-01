# Types

> **Quick-glance index of `ui/types`.** The shared type vocabulary components take in their props and hooks return — the accessible-name obligation, the spreadable ARIA bag, the layout axes, the size scale, and the responsive value shape with its resolver. Every entry but `BREAKPOINTS` and `resolveResponsive` is type-only, so it erases at build. Full signatures and caveats live in each symbol's TSDoc.

```ts
import type { AccessibleName, Responsive, Size } from 'ui/types'
```

## Accessibility

| Export | Summary |
|---|---|
| `AccessibleName` *(type)* | Requires an accessible name at the type level: exactly one of `aria-label` / `aria-labelledby` becomes mandatory, so an unnamed instance is a compile error. Intersect it on a component that emits a role with no other naming source — a `toolbar`, `tree`, `radiogroup`, an icon-only button, a bare progressbar. Pair with `Omit<…, 'aria-label' \| 'aria-labelledby'>` on the spread props; the optional native pair otherwise widens the requirement back to optional. |
| `AriaProps` *(type)* | A spreadable bag of accessibility-identity props: every `aria-*` attribute plus `role` and `id`. The shape a hook returns once it resolves an element's role and labelling refs, for the consumer to spread wholesale. All fields optional; intersect with required ones (`AriaProps & { id: string }`) where a relationship must hold. |

## Layout & sizing

| Export | Summary |
|---|---|
| `Orientation` *(type)* | Layout / navigation axis: `'horizontal' \| 'vertical'` — the direction a component lays out or arrow-key navigates along. |
| `ScrollOrientation` *(type)* | Scroll axis; widens `Orientation` with `'both'` for surfaces that pan on two axes. |
| `Size` *(type)* | Shared t-shirt size scale for size-aware components: `'xs' \| 'sm' \| 'md' \| 'lg'`, with `'md'` the baseline. |

## Responsive values

| Export | Summary |
|---|---|
| `BREAKPOINTS` | Ordered breakpoint names, mobile-first: `initial` · `sm` · `md` · `lg` · `xl` · `2xl`. `'initial'` is the unprefixed base; the rest map to Tailwind min-width prefixes. |
| `Breakpoint` *(type)* | One breakpoint name from `BREAKPOINTS`. |
| `Responsive` *(type)* | A prop value that is either a single `T` or a per-breakpoint map of `T`, applied mobile-first. |
| `resolveResponsive` | Resolves a `Responsive` value to an ordered class list, calling the resolver once per defined breakpoint, ascending. A bare value resolves to one unprefixed class; `'initial'` passes `undefined` as the breakpoint so the resolver emits an unprefixed utility. |

---

**See also:** [`CORE.md`](CORE.md) · [`HOOKS.md`](HOOKS.md) · [`COMPONENTS.md`](COMPONENTS.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
