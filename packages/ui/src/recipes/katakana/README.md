# Katakana 片仮名 — Bridge

> **Scope:** the bridge between kiso tokens and kata recipes. Each archetype is a pure function that receives a kiso token bundle and wires it into the recipe surface a kata exports.

## 1. Boundary

`katakana/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. A bridge imports **only** the recipe engine (`applyRecipe`, `defineRecipe`, `RecipeConfig`) from [`core/recipe`](../../core/recipe). It **imports nothing from kiso** — not values, not types: each bridge declares the token shape it needs as its own contract and receives the token *data* as the first argument. This keeps the bridge free of any dependency on kiso; data location is kiso's job, application is kata's, and the bridge owns only the wiring in between.

The contract is pinned by `katakana-purity-boundary.test.ts` (no kiso imports at all); the full boundary-test list lives in [`../README.md`](../README.md#3-boundary).

## 2. Shape

Every bridge is a function `(<tokens>, …) => k` generic only over its per-call overlay. `defineApplicator` no longer fits — the standard config is built per call from the injected tokens, not baked at module load — so bridges call `applyRecipe(standard(tokens), overlay, extras)` (control, check) or hand-roll the returned bundle (popover, segment, panel). The recipe-axis bridges pin the step keys in their contract (`Step = 'sm' | 'md' | 'lg'`) so the kata's variant types keep their literal axes; the pass-through bridge stays generic and annotates its return with the token field types:

- `control` / `check` — build the standard config / extras from the `control` token contract and forward to `applyRecipe`. The kata derives variants from `VariantProps<typeof k>`.
- `popover` — no `defineRecipe` calls; returns a bundle of class fragments anchored by an optional caller `text` override, defaulting to the bundle's own `text`. Generic over the bundle so the panel slot's concrete shape (motion config and all) flows through.
- `segment` — two `defineRecipe` calls (outer chrome + item) wrapped in a bundle alongside the raw `indicator` fragment.
- `panel` — the kata supplies its own `defineRecipe` results (each panel has different variants); the bridge composes the `panel` bundle's `layout` into the standard title / description / header / body / footer / close slots.

## 3. The namespaced barrel

Bridges are reached through a single `bridge` object so a kata imports the token bundle under its bare archetype name and the bridge as `bridge.<archetype>`, with no alias (see the call-site example in [`../README.md`](../README.md#2-direction)).

The barrel surfaces the `bridge` object only. Variant types resolve at the kata from the concrete result (`VariantProps<typeof k>`), not from the bridge — the bridges are generic over the token bundle and carry no concrete token type to project from.

## 4. Modules

| Bridge     | Tokens          | Returns                                                                                  | Kata members                                  |
| ---------- | --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| `control`  | `kiso/control`  | Outer-frame recipe + `inputControl` / `prefix` / `suffix`.                               | `input`, `textarea`                           |
| `check`    | `kiso/control`  | Check-surface recipe + visually-hidden `input` + `disabled` text.                        | `checkbox`, `radio`                           |
| `popover`  | `kiso/popover`  | `trigger` / `portal` / `text` / `panel` bundle.                                          | `popover`                                     |
| `segment`  | `kiso/segment`  | `control` / `item` recipes + `indicator` fragment.                                       | `segment`, `tabs`                             |
| `panel`    | `kiso/panel`    | Caller `panel` / `backdrop` recipes + standard slot bundle.                              | `dialog`, `drawer`, `sheet`                   |
| `backdrop` | `omote.backdrop`| Full-bleed scrim recipe with a `surface` axis (`flat` / `glass`). *Shared recipe, not an archetype.* | `drawer`, `sheet`                 |

`backdrop` is a small shared recipe rather than an archetype: dialog has no scrim of this shape, so the two edge-panels build it directly (`bridge.backdrop(omote.backdrop)`) and hand the result to `bridge.panel(…, { backdrop })`.

`slider` has no bridge — it's a pure colour bundle the slider kata read from `kiso/slider` directly. Kata that need only a subset of an archetype's fragments (combobox / listbox / date-picker / select / switch / box) likewise read the bundle from `kiso/<archetype>` without a bridge.

## 5. Rules

- **Never import kiso.** Receive tokens by argument; declare the shape they must satisfy as the bridge's own contract. Any kiso import — value or type — means a token reference leaked into the bridge.
- **Tokens in, recipe out.** The bridge owns structure (axes, slots, compounds), not data. A class string literal in a bridge belongs in a kiso bundle.
- **Namespaced access only.** Export bridges through the `bridge` object so kata call sites stay alias-free.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
