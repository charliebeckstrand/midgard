# Kiso 基礎 — Foundation

> **Scope:** the atomic utility-class concerns of the design system. One sub-folder per concern, each exposing a single named bundle through its `index.ts`. Archetype fragments shared by ≥2 kata live one tier up in [`katakana/<archetype>`](../katakana/README.md).

## 1. Boundary

`kiso/` is internal — its values are consumed only by `katakana/`, `kata/`, and `layouts/*/variants.ts`. Components and primitives reach kiso through their owning kata (`recipes/kata/<name>`). Foundational types (`Step`, `SunStep`, `Ma`, `Ji`, `Color`, `GroupOrientation`, `GroupPosition`) flow through the types-only `recipes` barrel so consumers can derive prop unions without threading the type through their funnel.

Composition flows downward only. Modules may import siblings — `narabi` reads `iro` · `ji` · `sen` · `shaku`, `hannou` reads the same plus `ugoki`, `omote` reads `iro` · `sen`, `kokkaku` reads `shaku` — but never reach upward into `katakana/` or `kata/`. The contract is pinned by `src/__tests__/recipes/boundary/kiso-boundary.test.ts`, `src/__tests__/components/boundary/component-recipe-boundary.test.ts`, and `src/__tests__/primitives/boundary/primitive-recipe-boundary.test.ts`.

## 2. Shape

Every module is a sub-folder. One file per concern; `index.ts` assembles the named bundle. The bundle name matches the folder (`iro`, `ji`, `ma`, …) so consumers reach a finished surface by name; the sub-files are the internal structure of each axis.

The two exceptions are `sun.ts` and `tsunagi.ts` — each carries a single coherent concern small enough that splitting would add files without adding clarity.

Every file opens with a `Layer: kiso · Concern: <concern>` docblock that pins the axis the module owns. Bodies emit Tailwind utility strings and class fragments — `defineRecipe()` is never invoked here. The recipe engine lives in [`core/recipe/`](../../core/recipe) and is called at the katakana applicator or kata public surface, where the variants axis is declared.

Type exports (`Ji`, `Ma`, `Step`, `SunStep`, `GroupOrientation`, `GroupPosition`) flow through each folder's `index.ts` alongside the runtime bundle.

## 3. Modules

| Module             | Concern                                                                                                                            | Files                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `iro/` (色)        | Variant × colour × slot palette matrix plus the semantic intent-colour text bundle.                                                | `solid`, `soft`, `outline`, `plain`, `bare`, `hover`, `text`, `intent`                                             |
| `ji/` (字)         | Typography — size scale spread at the top level, plus `weight` / `leading` / `family` aliases.                                     | `size`, `weight`, `leading`, `family`                                                                              |
| `ma/` (間)         | Named spacing scale projected as finished Tailwind utilities, plus the raw `--spacing` numerals.                                   | `stops`, `padding`, `margin`, `gap`                                                                                |
| `narabi/` (並び)   | Sibling arrangement — field adjacency, toggle grid, slide positioning, icon slot, truncated description, flex primitives.          | `field`, `group`, `toggle`, `slide`, `item`, `description`, `flex`                                                 |
| `omote/` (面)      | Generic surface fills and chromes.                                                                                                 | `bg`, `blur`, `surface`, `popover`, `glass`, `backdrop`, `content`, `skeleton`                                     |
| `hannou/` (反応)   | Interaction feedback plus the kata-shaped `item` and `nav` composites.                                                             | `disabled`, `fg`, `cursor`, `tint`, `glass-item`, `item`, `nav`                                                    |
| `sen/` (線)        | Borders, rings, dividers, focus indicators, forced-colors safety nets.                                                             | `tone`, `border`, `outline`, `ring`, `divider`, `focus`, `forced`                                                  |
| `shaku/` (尺)      | Dimension scales for distinct surfaces.                                                                                            | `icon`, `avatar`, `panel`, `scroll-area`, `mark`, `combobox`, `listbox`                                            |
| `ugoki/` (動き)    | Motion — CSS transitions and Framer Motion enter/exit configs.                                                                     | `css`, `spring`, `reveal`, `popover`, `overlay`, `toast`, `tooltip`, `collapse`, `panel`                           |
| `kasane/` (重ね)   | The signature 4-layer chrome stack plus the ring-compensated padding / radius / rounded / gap helpers.                             | `layers`, `padding`, `radius`, `rounded`, `gap`                                                                    |
| `kokkaku/` (骨格)  | Skeleton placeholder dimensions per component — chrome-, variant-, and colour-stripped.                                            | `avatar`, `badge`, `button`, `card`, `checkbox`, `control`, `heading`, `radio`, `switch`, `text`, `textarea`       |
| `sun.ts` (寸)      | Named density steps (`sm` / `md` / `lg`) and the per-step token table. *Flat file — single coherent concern.*                      | —                                                                                                                  |
| `tsunagi.ts` (繋ぎ) | Group-join class fragments — dormant until the parent stamps `data-group` at runtime. *Flat file — single coherent concern.*       | —                                                                                                                  |

## 4. Rules

- **One concern per sub-file.** If a new fragment crosses axes, add a new sub-file rather than overload an existing one.
- **Atoms only.** A fragment shared by ≥2 kata that carries archetype shape (frame + chrome + slots) belongs in `katakana/<archetype>`, not here. Kiso holds single-axis substrate.
- **No `defineRecipe()`.** Kiso emits class fragments and token maps; the variants axis is declared at the katakana applicator layer or at the kata surface.
- **Seal with `as const`.** Kata derive their prop types from kiso shapes — widening here propagates everywhere.
- **Compose, don't fork.** A kata, applicator, or archetype that re-derives a token already in kiso is a defect; fold it back into the source module.

## 5. Utility-array style

Class-fragment arrays in kiso follow a consistent shape so cross-file reads stay predictable.

**Property order.** When an array carries multiple utilities, group them in this order:

1. `z-index` (`z-10`, `z-50`)
2. `position` (`relative`, `absolute`, `fixed`, `sticky`, `inset-*`, `top-*`, `left-*`, …)
3. `display` and `flex/grid alignment` (`block`, `flex`, `inline-flex`, `grid`, `items-*`, `justify-*`, `flex-1`, `min-w-0`, …)
4. `width / height / size` (`w-full`, `h-4`, `size-5`, `max-w-sm`, …)
5. `padding / margin / gap` (`p-2`, `mx-auto`, `gap-2`, …)
6. `bg` (`bg-white`, `bg-transparent`, …)
7. `border / ring / outline` (`border-0`, `border-zinc-200`, `ring-1`, `outline-none`, …)
8. `radius` (`rounded-lg`, `rounded-full`, …)
9. `text` (`text-zinc-700`, `text-sm`, `font-medium`, `leading-tight`, `placeholder:text-*`, …)
10. `interaction / state` (`hover:*`, `focus:*`, `disabled:*`, `cursor-*`, …)
11. `motion` (`transition-*`, `duration-*`, `animate-*`)
12. `forced-colors` safety nets

Cross-cutting fragments spread from sibling kiso (`...iro.text.default`, `...hannou.cursor`) slot into the group that matches their concern.

**One string per property.** Combine same-property utilities into a single quoted entry when their only difference is a variant prefix:

```ts
// good — bg with its read-only variant is one property
'bg-transparent read-only:bg-transparent',

// good — placeholder colour with its dark-mode pair
'placeholder:text-zinc-500 dark:placeholder:text-zinc-400',

// bad — same property, broken across two entries
'bg-transparent',
'read-only:bg-transparent',
```

**Separate strings carry meaning.** A string break signals a concern boundary — different property family, different axis, or a deliberate visual grouping. Don't introduce arbitrary breaks; don't merge unrelated properties to save space.

**Mode pairs go through `mode()`.** When both a light class and its `dark:` counterpart need to ship to the Tailwind scanner, use the `mode(light, dark)` helper from `core/recipe` rather than open-coding the pair.

---

**See also:** [`../README.md`](../README.md), [`../../../REFERENCE.md`](../../../REFERENCE.md).
