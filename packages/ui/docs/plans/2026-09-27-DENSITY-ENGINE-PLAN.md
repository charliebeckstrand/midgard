# Density Engine — Design Plan — 2026-09-27

How density becomes a foundation of its own, so that a component becomes density-aware by what it is built from, not by per-component wiring. It follows [`2026-09-27-DENSITY-VARIANTS-PLAN.md`](2026-09-27-DENSITY-VARIANTS-PLAN.md), which made density a Tailwind variant.

## Thesis

After the variants, density still had no owner. Its pieces sat in five places: the context in `primitives/density`, the level names in `providers/density`, the steps in `kiso/sun`, the plugin in `recipes`, and the affix step-down in `primitives/affix`. It had five words for one concept: `DensityLevel`, `Step`, `DensityStep`, `Ma`, and a two-axis context token (`space`, `size`). And each component had to wire density by hand: a hook, a resolve order, a size axis in its kata, and triads in each class list.

The engine gives density one home, one vocabulary, one scope, and one resolver. Then the token layer takes on the ramps, so a kata built from tokens needs no wiring.

## Decisions

- **One step, not two axes.** The context carried `space` (padding) and `size` (text). `data-density` holds one step, so the variants cannot express a split, and no app used one. The context now holds one `DensityStep`, the same value as the attribute. Menu, Listbox, Combobox, Input, and Textarea keep their `size` prop and lose the split. Their kata keep a `density` and a `size` axis for now, fed the same step; the family increments fold them.
- **`core/density` is the engine.** It holds `densitySteps`, `DensityStep`, `AmbientStep`, `toAmbientStep`, and the Tailwind plugin (`variants.ts`). It imports nothing from the package, so recipes, primitives, and components can all read it. `ui/core` exports the vocabulary.
- **A scope is one prop.** `density` on PolymorphicStatic writes `data-density` and opens the `Density` context around the children. Box forwards it. Card, Table, and Badge open their scope with it. A leaf with no children (Icon, LoadingSpinner) writes the attribute alone. The context renders only for a scope, so an element with no step adds no client boundary to a server tree.
- **One resolver.** `useDensityStep(explicit?)` returns `explicit ?? scope ?? 'md'`. A component with a three-step axis clamps with `toAmbientStep` (`xs` → `sm`, `xl` → `lg`). `useDensity`, `useControlSize`, `densityPresets`, and `DensityScope` are gone. `useResolvedSize` stays for the Affix step until the control family moves.
- **A gate.** `density-native-boundary.test.ts` lists each component that takes its step from the variants alone. Its recipes may not have a `size` or `density` axis, and its files may not read the density context. A family moves by adding its entries.

## Increments

1. **Engine (this plan's first pull request).** The decisions above, with Card, Table, Badge, Icon, and LoadingSpinner on the engine.
2. **Tokens.** A stepped utility writes one property at each step in one class: `density-p-[2,3,4]` in place of the triad `density-sm:p-2 density-md:p-3 density-lg:p-4`. Three values give `sm`, `md`, and `lg`, and each outer step takes the value of its neighbor. Five values give each step. So each class covers each of `densitySteps`, and a component inside an `xs` or `xl` scope has a value for its step. `core/density/utilities.ts` defines the spacing, size, text, and radius utilities, and `rungs.ts` gives them the same rank as the variants. The ring utilities (`px-ring-2` and the other sides, in `kasane/ring-utilities.ts`) replace the literal maps of `kasane` and each inline `calc(--spacing(n)-1px)`, and they have stepped forms (`density-px-ring-[1,1.5,2]`). `tailwind-merge` has a class group for each, so a consumer `px-4` still merges and a later stepped class replaces an earlier one. `density-any` moves into layer 1 with no specificity, because a layer takes its rank from its first rule, and a stepped utility can come before each variant.
3. **Affix as a scope.** A control slot writes `data-density={stepDown(step)}` and opens the `Density` context at that step, in place of `AffixContext`. The slots are the Input and select affixes, the Textarea action row, the DatePicker clear slot, the Nav and Sidebar item slots, and the ChatListItem actions. `stepDown` lives in `core/density`. Static leaves in a slot step down through the stepped utilities, so the slot icon and spinner projections of `kiso/control/affix`, Nav, and Sidebar go, and so does the Badge affix rule in `REFERENCE.md` §2. A TagInput chip takes the slot step with no `size`, and its leading pad is a stepped class. Button opens a scope at its own size, so its spinner needs no `size`. An `xl` scope gives the `lg` button. `useResolvedSize`, `AffixContext`, `useAffix`, and `affixStepDown` are gone. Progress, Sparkline, and the charts read `useDensityStep` and clamp with `toAmbientStep`, so an `xs` slot gives them `sm` in place of the `md` fallback.
4. **Families.** Each family swaps fixed tokens for ramps, deletes its size axis and its hook, opens its scopes with the `density` prop, and joins the gate. Style-only readers go first: Label, Description, Message, Option, Panel, Tooltip, Tabs, List, Menu, Sidebar. Readers that need a JS value keep `useDensityStep`: Grid metrics, Chart, the virtualizer.

   First batch: scope parity, then the field text. Many scopes opened the context alone: Control, Group, Drawer, Calendar, the Input and Textarea frames, and the popover, menu, listbox, combobox, date-picker, and color-picker panels. A static reader follows `data-density`, so those scopes now write it too. PopoverPanel takes a `density` prop, and the popover bodies use the one on Box. A parity check in `density-native-boundary.test.ts` holds it. Then Label, Description, and Message take `ji.textRamp` (`density-text-[sm,base,lg]`), lose their size axis and their hook, and join the gate.

## Costs accepted

- **Breaking change to `ui/primitives/density`.** `Density` takes `step` in place of `space`, `size`, and `scale`. No app used the removed API.
- **A sized Badge opens a context scope.** A client child of the badge (the TagInput remove button) now reads the badge step from context. It read the same step through the Affix context before.
- **Table scope on the scroll container.** The `size` of a Table makes its Box wrapper the scope, not the `<table>`. The cells follow it the same way.
