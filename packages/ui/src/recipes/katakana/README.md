# Katakana 片仮名 — Bridge

> **Scope:** the bridge between kiso tokens and kata recipes. Each archetype is a pure function that receives a kiso token bundle and wires it into the recipe surface a kata exports.

## 1. Boundary

`katakana/` is internal — omitted from `package.json` `exports` and not re-exported from `src/recipes/index.ts`. A bridge imports **only** the recipe engine (`applyRecipe`, `defineRecipe`, `RecipeConfig`) from [`core/recipe`](../../core/recipe). It **imports nothing from kiso** — not values, not types: each bridge declares the token shape it needs as its own contract and receives the token *data* as the first argument. This keeps the bridge free of any dependency on kiso; data location is kiso's job, application is kata's, and the bridge owns only the wiring in between.

The contract is pinned by the `recipes/katakana/**` override in `biome.json` (no kiso imports at all); the full boundary list lives in [`../README.md`](../README.md#3-boundary).

## 2. Shape

Every bridge is a function `(<tokens>, …) => k` generic only over its per-call overlay. `defineApplicator` no longer fits — the standard config is built per call from the injected tokens, not baked at module load — so bridges call `applyRecipe(standard(tokens), overlay, extras)` (control, check) or hand-roll the returned bundle (panel, palette). No bridge has a step axis: the density classes are stepped utilities in the base, so a kata's variant types hold only its other axes. The pass-through bridge stays generic and annotates its return with the token field types:

- `control` / `check` — build the standard config / extras from the `control` token contract and forward to `applyRecipe`. The kata derives variants from `VariantProps<typeof k>`.
- `panel` — the kata supplies its own `defineRecipe` results (each panel has different variants); the bridge composes the `panel` bundle's `layout` into the standard title / description / header / body / footer slots.
- `palette` — no `defineRecipe` calls; bundles the solid / soft / outline slots of an `iro` palette into the matrix that `definePalette` takes. Generic over the color set, so the wider `iro` palette widens the `color` axis of the kata.

## 3. The namespaced barrel

Bridges are reached through a single `bridge` object so a kata imports the token bundle under its bare archetype name and the bridge as `bridge.<archetype>`, with no alias (see the call-site example in [`../README.md`](../README.md#2-direction)).

The barrel surfaces the `bridge` object only, `palette` and `backdrop` included. Variant types resolve at the kata from the concrete result (`VariantProps<typeof k>`), not from the bridge — the bridges are generic over the token bundle and carry no concrete token type to project from.

## 4. Modules

| Bridge     | Tokens          | Returns                                                                                  | Kata members                                  |
| ---------- | --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| `control`  | `kiso/control`  | Outer-frame recipe + the `surface` recipe of the ControlFrame + the `number` slot.     | `input`, `textarea`                           |
| `check`    | `kiso/control`  | Check-surface recipe + visually-hidden `input` + `disabled` text.                        | `checkbox`, `radio`                           |
| `panel`    | `kiso/panel`    | Caller `panel` / `backdrop` recipes + standard slot bundle.                              | `drawer`, `sheet`                             |
| `backdrop` | `omote.backdrop`| Full-bleed scrim recipe with a `surface` axis (`flat` / `glass`) and a `desaturate` axis (gray out what shows through). *Shared recipe, not an archetype.* | `dialog`, `drawer`, `sheet`       |
| `palette`  | `iro.palette`   | The solid / soft / outline matrix for `definePalette`. *Shared wiring, not an archetype.* | `alert`, `avatar`, `badge`                    |

`backdrop` is a small shared recipe rather than an archetype: the panel bridge does not build it. Each modal panel builds it directly (`bridge.backdrop(omote.backdrop)`). Drawer and Sheet hand the result to `bridge.panel(…, { backdrop })`. Dialog uses the default slots of `createPanel`, so it has no `bridge.panel` call and keeps the backdrop on its own `k`.

`popover` has no bridge: it has one kata, `kata/popover`, which reads `kiso/popover` directly. `segment` has no bridge: Segment and Tabs share it through one kata, `kata/tabs`, which reads `kiso/segment` directly. `slider` has no bridge — it's a pure color bundle the slider kata read from `kiso/slider` directly. Kata that need only a subset of an archetype's fragments (combobox / listbox / date-picker / color-picker / select / switch / box) likewise read the bundle from `kiso/<archetype>` without a bridge.

## 5. Rules

- **Never import kiso.** Receive tokens by argument; declare the shape they must satisfy as the bridge's own contract. Any kiso import — value or type — means a token reference leaked into the bridge.
- **Tokens in, recipe out.** The bridge owns structure (axes, slots, compounds), not data. A class string literal in a bridge belongs in a kiso bundle.
- **Namespaced access only.** Export bridges through the `bridge` object so kata call sites stay alias-free.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
