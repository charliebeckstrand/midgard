# Katakana 片仮名 — Bridge

> **Scope:** the bridge between kiso tokens and kata recipes. Each archetype is a pure function that receives a kiso token bundle and wires it into the recipe surface a kata exports.

## 1. Boundary

`katakana/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. A bridge imports **only** the recipe engine and applicator helpers (`applyRecipe`, `ApplicatorReturn`, `defineRecipe`, `VariantProps`) from [`core/recipe`](../../core/recipe). It **never imports kiso values** — the token *shape* flows in as a type (`import type { Control } from '../kiso/control'`), the token *data* as the first argument. This keeps the bridge free of any runtime dependency on kiso; data location is kiso's job, application is kata's, and the bridge owns only the wiring in between.

The contract is pinned by `src/__tests__/recipes/boundary/katakana-purity-boundary.test.ts` (no kiso value imports; type-only allowed), `src/__tests__/recipes/boundary/kata-boundary.test.ts`, and the component / primitive recipe-boundary tests.

## 2. Shape

Every bridge is a function `(<tokens>, …) => k`. `defineApplicator` no longer fits — the standard config is built per call from the injected tokens, not baked at module load — so bridges call `applyRecipe(standard(tokens), overlay, extras)` (control, check) or hand-roll the returned bundle (popover, segment, panel):

- `control` / `check` — build the standard config / extras from the `control` token bundle and forward to `applyRecipe`. `control` exposes `ControlVariants`; `check` lets its kata derive variants from `VariantProps<typeof k>`.
- `popover` — no `defineRecipe` calls; returns a bundle of class fragments anchored by an optional caller `text` override, defaulting to the bundle's own `text`.
- `segment` — two `defineRecipe` calls (outer chrome + item) wrapped in a bundle alongside the raw `indicator` fragment.
- `panel` — the kata supplies its own `defineRecipe` results (each panel has different variants); the bridge composes the `panel` bundle's `layout` into the standard title / description / header / body / footer / close slots.

## 3. The namespaced barrel

Bridges are reached through a single `katakana` object so a kata imports the token bundle under its bare archetype name and the bridge as `katakana.<archetype>`, with no alias:

```ts
import { control } from '../kiso/control'   // tokens
import { katakana } from '../katakana'        // bridge
export const k = katakana.control(control, { base: 'block', slots: { … } })
```

The barrel also re-exports the variant types real consumers import (`ControlVariants`, `SegmentControlVariants`, `SegmentItemVariants`). `check`, `popover`, and `panel` expose none — their kata compute variants from `VariantProps<typeof k>` or pass their own recipes.

## 4. Modules

| Bridge     | Tokens          | Returns                                                                                  | Kata members                                  |
| ---------- | --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| `control`  | `kiso/control`  | Outer-frame recipe + `inputControl` / `prefix` / `suffix`.                               | `input`, `textarea`                           |
| `check`    | `kiso/control`  | Check-surface recipe + visually-hidden `input` + `disabled` text.                        | `checkbox`, `radio`                           |
| `popover`  | `kiso/popover`  | `trigger` / `portal` / `text` / `panel` bundle.                                          | `popover`                                     |
| `segment`  | `kiso/segment`  | `control` / `item` recipes + `indicator` fragment.                                       | `segment`, `tabs`                             |
| `panel`    | `kiso/panel`    | Caller `panel` / `backdrop` recipes + standard slot bundle.                              | `dialog`, `drawer`, `sheet`                   |

`slider` has no bridge — it's a pure colour bundle the slider kata read from `kiso/slider` directly. Kata that need only a subset of an archetype's fragments (combobox / listbox / date-picker / select / switch / box) likewise read the bundle from `kiso/<archetype>` without a bridge.

## 5. Rules

- **Never import kiso values.** Receive tokens by argument; reference their shape by `import type`. A value import means data leaked into the bridge.
- **Tokens in, recipe out.** The bridge owns structure (axes, slots, compounds), not data. A class string literal in a bridge belongs in a kiso bundle.
- **Namespaced access only.** Export bridges through the `katakana` object so kata call sites stay alias-free.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
