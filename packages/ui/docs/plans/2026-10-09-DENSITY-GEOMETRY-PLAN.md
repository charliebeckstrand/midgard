# Density Geometry — Design Plan — 2026-10-09

A plan for a later session to carry out. It replaces the label icon work of 2026-10-09 (the `fix/label-icon-ramp` branch), whose findings it keeps. Read all of it before you change a file: section 3 states the model, section 4 lists the decisions, and section 6 gives the order of work.

## 1. Goal and state

**The owner's goal.** Every density step is geometrically exact, and this holds everywhere the scale is used. `xl` is a real step, not a repeat of `lg`, and `xs` is a real step too. No padding workaround and no documented caveat makes a box come out right. When the design theory holds, the components are correct by construction.

**State of the branches** (main at `d77a593` when written):

| Branch | Commits | Status |
|---|---|---|
| `fix/sidebar-item-ramp` | `d760467` Sidebar item padding without the ring subtraction (equals Nav), plus `shaku.icon.row` (3-step); `aa4c0a2` Menu/Option rows on `shaku.icon.row`. Also carries this plan. | Merge. The new model replaces its values, but each commit fixes a real bug, and nothing in it is a workaround. |
| `fix/label-icon-ramp` | `9e0a8b5`, `fca7b52` (icon = chip text + 4px, plus an icon-only pad ramp, a shrunk bare pad, a constant bare affix pad, and a 1px `xs` bare pad) | **Do not merge.** It added the padding workarounds that this plan removes. Keep it only as a reference. Its test ideas carry over (section 5.2). |

## 2. Root cause

Tailwind's line heights step 4px (16/20/24/28) while the font sizes step 2px (12/14/16/18), and `text-xl` keeps the 28px line of `text-lg`. The original system tied the icon to the line box (icon = line − 4). That kept the geometry exact: an icon-only square equalled a labelled button with no extra ramp. But the icon then stepped 4px against 2px of text (ratio 1.00 → 1.33), and every ramp stopped at `lg`. Tying the icon to the text instead (the `fix/label-icon-ramp` attempt) broke the geometry, and the padding ramps there were patches over that.

Text, line height and icon can step at one rate only if the line height steps with the text. That is the fix. Everything else follows from it.

## 3. The model

### 3.1 Step index

`k`: `xs` = −2, `sm` = −1, `md` = 0, `lg` = +1, `xl` = +2. Every ramp has five distinct values. A three-value ramp is not allowed after the migration.

### 3.2 Text-coupled geometry (exact formulas)

| Quantity | Formula | xs | sm | md | lg | xl |
|---|---|---|---|---|---|---|
| text `f` (body, chip) | 16 + 2k | 12 | 14 | 16 | 18 | 20 |
| line height `L` | f + 8 | 20 | 22 | 24 | 26 | 28 |
| icon `I` (every host icon) | f + 4 = L − 4 | 16 | 18 | 20 | 22 | 24 |
| icon margin in the line box | (L − I)/2 | 2 | 2 | 2 | 2 | 2 |
| icon : text | — | 1.33 | 1.29 | 1.25 | 1.22 | 1.20 |
| line : text | — | 1.67 | 1.57 | 1.50 | 1.44 | 1.40 |

The line-to-text ratio falls as the text grows, which is what typography wants. Every size is even, so an icon centres on a whole pixel. `md` is pixel-identical to today for text, line and icon.

### 3.3 Component boxes (worked values; `py`/`p` are px after the 1px ring subtraction)

| Box | Formula | xs | sm | md | lg | xl | Today (xs/sm/md/lg) |
|---|---|---|---|---|---|---|---|
| Button `py` (label) | `py-ring-[1,1.5,2,2.5,3]` | 3 | 5 | 7 | 9 | 11 | 3/5/7/9 |
| Button `p` (base, also the icon-only pad) | `p-ring-[1.5,2,2.5,3,3.5]` = py + 2 | 5 | 7 | 9 | 11 | 13 | 5/7/9/11 |
| Button height | L + 2·py | 26 | 32 | 38 | 44 | 50 | 22/30/38/46 |
| Icon-only square | I + 2·p | 26 | 32 | 38 | 44 | 50 | = height, by identity |
| Control height (Input, Select) | L + 2·py, same py ramp | 26 | 32 | 38 | 44 | 50 | –/30/38/46 |
| Bare button | I + 2·bare, bare = 3/4/5/6/7 | 22 | 26 | 30 | 34 | 38 | 18/24/30/36 |
| Badge height | L + 2·3 (fixed `py-ring-1`) | 26 | 28 | 30 | 32 | 34 | 22/26/30/34 |
| Nav/Sidebar row | L + 2·p, p = 4/6/8/10/12 | 28 | 34 | 40 | 46 | 52 | –/32/40/48 |

Note: the button ring ramps already have the right `xs`–`lg` values (`p-ring` `[1.5,2,2.5,3,3]`, label `py-ring` `[1,1.5,2,2.5,2.5]`). They only need `xl` = 3.5 and 3. The heights change because `L` changes.

**Correction to the chat summary of 2026-10-09:** the chat table gave control heights 30/34/38/42/46 next to a `py` of 5/6/7/8/9. Those numbers were inconsistent. The values above are the correct ones: `py` steps 2px, so heights step 6px.

### 3.4 Identities that hold at every step

These replace every workaround. A test proves each (section 5).

1. **Icon centring:** (L − I)/2 = 2.
2. **Icon-only square = labelled height:** I + 2p = L + 2py, because p − py = 2 = (L − I)/2. The button's own two ramps give this; no icon-only ramp exists.
3. **Control height = button height** at each step, so an Input and a Button align in a row.
4. **One glyph size per step:** a labelled button, an icon-only button, a bare button, a badge, a row and an affix slot all size an icon child at `I`. A spinner child takes `I` too.
5. **Slot = host − 1 step.** `xl` → `lg`, `lg` → `md`, `md` → `sm`, `sm` → `xs`. A slot of an `xs` host takes `xs`, because no step is below `xs` (D3).
6. **Skeleton = real box** at each step (`skeleton-parity`).
7. **Removable chip symmetry:** the leading pad = the pill `px` + the bare pad. **Bare affix pad** = control `px` − bare pad at the slot step. Both are affine, because each term is.

### 3.5 Ramps that do not touch text

Padding, gaps, radii, widths and layout spacing are not tied to `L`. Each one keeps its `sm`/`md`/`lg` values (the look users can reach today) and gains an affine `xs` and `xl` on the same step: `[a,b,c]` → `[a−d, a, b, c, c+d]`. the Appendix lists the proposed value for each ramp. Section 4, D8, covers the ramps where this rule fails.

## 4. Decisions

The recommended answer is in bold. Only the items marked **owner** need the owner's word; the next session may take every other recommendation as given.

- **D1 — Line height (decided by the owner's goal).** **The `density-text` utility writes `line-height: var(--tw-leading, calc(var(--text-<name>) + 0.5rem))`**, which is f + 8px, in place of Tailwind's per-size leading (`core/density/utilities.ts`, `declare.text`). Plain `text-*` classes keep Tailwind's leading, so text outside the density system does not move. A `leading-*` class still wins through `--tw-leading`.
- **D2 — Five distinct steps (decided).** Every ramp gets five distinct values. Three-value ramps are banned: `valuesByStep` keeps reading three values only until the last ramp is migrated, and then the boundary test rejects them. The "controls stop at `lg`" contract is removed (section 6, PR 2).
- **D3 — The slot below `xs` (owner).** A slot is one step below its host. **An `xs` host's slot takes `xs`**, because no step is below `xs`. This is the one boundary in the model, and it is inherent, not a workaround. The alternative is a sixth step `2xs` used only by slots (10px text, 14px icon), which grows the scale for one case. Recommended: no `2xs`.
- **D4 — One icon scale (owner).** **The standalone `Icon` scale becomes `I` too** (16/18/20/22/24 for `xs`–`xl`), so `shaku.icon.size`, `icon.base`, `icon.slot.base` and `icon.row` collapse into one ramp, `density-size-[4,4.5,5,5.5,6]`. No app passes `size` to `Icon` (checked 2026-10-09: 0 uses in `apps/`), so this costs nothing downstream. `Icon` keeps its numeric `size` for an arbitrary size. `check.box` (Checkbox, Radio, option check, swatch, rating star, tree check) is a glyph beside a label too, so it takes `I`, and `check.mark` takes I − 4.
- **D5 — Headings and the combinator (owner).** `title`, `h1`–`h3` and `combinator` are text hierarchy, not component geometry, and Tailwind's heading sizes do not step evenly (18/20/24/30/36). **Recommended: give each heading ramp five steps on its own named sizes (h3 `[base,lg,xl,2xl,3xl]`, h2 `[lg,xl,2xl,3xl,4xl]`, h1 `[xl,2xl,3xl,4xl,5xl]`, title `[sm,base,lg,xl,2xl]`), and let D1's f + 8 set their leading** (ratio 1.22 at 36px). The combinator follows `chip` one step down (it is a slot of a chip row), so it becomes `chip` read at the slot step, and its own ramp goes away.
- **D6 — Small text at `xs`.** `text.small` is f − 2 → 10/12/14/16/18. **Add `--text-2xs: 0.625rem` to the theme** (`packages/ui/tailwind.css`), so `density-text` can name it.
- **D7 — Bare buttons.** The bare pad stays on its current step (`[0.75,1,1.25,1.5]`, plus `xl` 1.75), so the box is I + 2·bare = 22/26/30/34/38. The 24px hit target comes from `TouchTarget` at `xs`, as it does today. No 1px pad, and no caveat about the focus ring.
- **D8 — Steep layout spacing (owner).** 28 ramps whose step is half their `md` value (the gap and padding scales `xs`/`sm`, field and fieldset gaps, tooltip, calendar header, resize handle, `gap.loose`, `radius.tooltip`) reach 0 at `xs` under the affine extension (the Appendix, proposals starting `[0,`). Options:
  - (a) **Geometric continuation for spacing** (recommended): spacing is perceived as a ratio, so these ramps continue by their own ratio: `xs` = sm²/md, `xl` = lg²/md, snapped to the 1px grid under 8px and to the 2px grid from 8px. Example: 4/8/12 → 2/4/8/12/18. The rule applies to the spacing family only (section 3.5 ramps), never to the text-coupled family.
  - (b) Halve the step of these ramps everywhere. This changes `sm` and `lg` values that users see today.
  - (c) Allow 0 at `xs`.
- **D9 — The 25 uneven ramps** (the Appendix, kind `NONAFFINE`). Each one gets its own affine design in the PR that migrates its family. The known cases:
  - The affix and slot ramps (`space.affix.*`, `space.slot.*`, `space.tags.y`, the combinator) look uneven only because a slot never reaches `lg` today. With D3 they become affine.
  - `space.option.y` 4/6/10 → 2/4/6/8/10.
  - `gap.option` 8/12/12 → 4/8/12/16/20, or 10/11/12/13/14 (owner's eye).
  - `space.popover` 12/16/24, `space.segment.item.x` 10/12/16, `size.tab.width`, `size.calendar.width`, `size.colorPanel.fields`, `size.line.timeline`, `size.swatch.base`, `radius.combinator`, `gap.rating` and the kbd pads: make each affine around its `md` value.
- **D10 — Density levels.** `DensityProvider` keeps compact/snug/loose (`sm`/`md`/`lg`). `xs` and `xl` stay reachable through `size` and explicit scopes. Not in scope.

## 5. Enforcement: the spec is code, and a test holds every ramp to it

### 5.1 `core/density/geometry.ts` (new)

It exports the step index, the formulas of section 3.2 (`text(k)`, `leading(k)`, `icon(k)`), the box formulas of section 3.3, and a registry. The registry maps each text-coupled ramp (by its `dan` key path) to the formula that produces its five px values. Tailwind needs literal classes, so the `dan` files keep their literals, and the registry checks them.

### 5.2 Tests

- **`__tests__/core/density-geometry.test.ts` (new, node).**
  - It parses every `density-*` class in `recipes/kiso/dan/*.ts` and checks that each has five values, that they are affine (a constant step), and that none is ≤ 0 except a documented margin. Spacing ramps that follow D8(a) are checked against the geometric rule instead.
  - For each registry entry, the literal's px values must equal the formula.
  - Identities 1, 2 and 3 of section 3.4 are checked arithmetically against the live ramps.
  - Carry over the approach of `fix/label-icon-ramp`'s `shaku-icon-ramp.test.ts`, which reads the live text ramp and asserts icon = text + 4.
- **Browser (real geometry), extending the existing suites:**
  - `button-box` (square = height at all five steps);
  - a new side-by-side pin with a labelled, an icon-only and a bare Button, a Badge, a Nav row and an Input with a prefix icon and a bare clear button, which checks one glyph size at each step (carry over `fca7b52`'s side-by-side pin and extend it);
  - `density-scope` `xs`/`xl` root cases, including a slot under `xl` = `lg`;
  - `skeleton-parity`, `size-steps` (`helpers/size-axes.ts`: add `xs`/`xl` to every axis).
- `size-scale-boundary.test.ts` keeps its rules (one home, one literal per ramp). Its "three or five values" rule becomes "five values".

## 6. Order of work (one PR each; each one green on the full gate)

Each PR runs Biome, `turbo run check-types`, `test:changed`, the full browser config (`vitest.browser.config.ts`, 350 files) and the pre-push gate. A push takes up to 10 minutes.

1. **PR 1 — Spec and line height.** Add `geometry.ts`, the registry and the geometry test, scoped to the text family first. D1 changes `declare.text`. D6 adds `--text-2xs`. Then `text.body`/`chip`/`small` go to five steps, and the icon scale (D4) and the text-box heights in section 3.3 follow: `button.base`, `pagination`, `control.base`, `badge.base`, `button.icon`, `row`, `line.*`, `avatar.sidebar`, `check.*`, `tree.indent`, `stat.value.base` and `segment.base` (the Appendix rows marked **F:**). This is the visible change at `sm` and `lg`.
2. **PR 2 — The step contract.**
   - `core/density/steps.ts`: remove the clamps of `ControlStep`, `InnerStep` and `toInnerStep` from ramp reading. `slotStep` = `stepDown` with `xs` → `xs`. Update `valuesByStep`.
   - `core/density/scale.ts`: `stepsOfRamp` and `defineScale` yield five steps.
   - `core/density/rungs.ts`: slot hosts at `lg` and `xl`.
   - `recipes/kiso/control/density.ts` and `control/affix.ts`: the xs and lg/xl notes.
   - `input-frame.tsx` and `control-frame.tsx`: `density?: ControlStep`.
   - The 25 control `size` props gain `xs` and `xl`; check that `ScaleStep` derives them.
   - Update the TSDoc of each public prop that names its steps (`sidebar-item.tsx` `size`, Button, Badge, controls), per CLAUDE.md §3.4.
3. **PR 3 — Spacing family.** Section 3.5 extension plus D8 for the 129 affine ramps (the Appendix). Mechanical, but make it one family per commit (gap, space, radius, size widths).
4. **PR 4 — The uneven ramps (D9)** and the components with mixed step counts from the 2026-10-09 inventory: Tree (icon/chevron), Alert/Toast (icon vs title), Tabs and Segment (no icon projection), Accordion (fixed text beside a stepped icon), CommandPalette (fixed icon, stepped gap), Breadcrumb (fixed text, stepped gap), the Option check column (fixed grid column beside a stepped check, `option.ts:12`).
5. **PR 5 — Docs.**
   - `REFERENCE.md` L30 (the "controls stop at lg" paragraph);
   - `packages/ui/docs/CORE.md` L26–33;
   - `PRIMITIVES.md` L40;
   - `RECIPES.md` (the `shaku` row);
   - `CONVENTIONS.md` §5.5;
   - the earlier density plans that state the old contract (`2026-09-27-DENSITY-ENGINE-PLAN.md` L22, L28; `2026-09-28-DENSITY-PRE-PAINT-PLAN.md` L45) get a note pointing here.

## 7. Tests that pin the old contract (update in the PR that changes it)

From the 2026-10-09 inventory (paths under `packages/ui/src/__tests__/`):

- **Contract:**
  - `core/control-step.test.ts`: `ControlStep` excludes `xl`; 25 size props = `sm|md|lg`. Its L29 cites decision "Q-B, 2026-10-02", which is not in the repo, and this plan overrides it.
  - `core/density-scale.test.ts`;
  - `primitives/density.test.tsx` L90–111 (`toInnerStep`, `stepDown`, `slotStep`);
  - `core/density-rungs.test.ts` L99–110, L146–157;
  - `core/density-utilities.test.ts`;
  - `providers/density.test.tsx`;
  - `boundary/size-scale-boundary.test.ts`;
  - `docs/__tests__/size-axes.test.ts`.
- **Ramps:**
  - `recipes/ji-text-ramp.test.ts` (each step = `size[toInnerStep(step)]`);
  - `recipes/shaku-icon-ramp.test.ts`;
  - `recipes/combinator-button-pad.test.ts`;
  - `recipes/affix-compensation.test.ts`;
  - `recipes/removable-chip-pad.test.ts`;
  - `components/icon.test.tsx:66`;
  - `primitives/option.test.tsx:194`;
  - `components/rating.test.tsx:415`;
  - `core/cn.test.ts:185`.
- **Pixels:**
  - `browser/geometry/button-loading-affix-size`, `nav-density`, `query-density`, `static-leaf-parent-size`, `button-box`, `skeleton-parity`, `size-steps`, `alert-icon-close`, `dashboard-spark`;
  - `browser/item-row-density`;
  - `browser/density-scope` (L218–286 `xl` = `lg` cases, the slot cases, and the row cases).

## 8. Evidence carried over from the spike

- **Survey** (read from package source): no system holds a constant icon:text ratio. M3 Expressive buttons fall 1.43 → 1.25 as the size grows, the same shape as section 3.2. Icon sizes are almost always even. Only font-glyph systems (Ant Design, Font Awesome, SF Symbols) size icons in `em`.
- **Measured in Chromium:** fractional icons (17.5, 22.5) sit at quarter-pixel offsets, and their horizontal strokes blur on 1x screens. 18 and 22 stay crisp. Lucide's stroke already renders fractionally at 16 and 20 (1.33/1.67px), so 18 and 22 add no new class of blur.
- **Why not a constant ratio:** a 1.125 modular scale gives 12.6/14.2/16/18/20.3, which is within 0.3px of 12/14/16/18/20. The 2px ramp is that scale on the pixel grid.
- **Users can only pick `sm`/`md`/`lg`** (compact/snug/loose). `xs` reaches users in affix slots and through explicit sizes.

## Appendix — Ramp inventory

Generated from `recipes/kiso/dan/*.ts` on `fix/sidebar-item-ramp` at `aa4c0a2`. The `px` column lists the current values: three values mean `sm`/`md`/`lg`, and five mean `xs`–`xl`. **Kinds:**

- `3-affine`: extend mechanically per section 3.5. The `proposed` column holds the result.
- `5-xl-repeat`: only `xl` changes.
- `NONAFFINE`: design per D9.
- A bold **F:** entry is text-coupled: use the formula, not the mechanical proposal.
- A **D5** entry follows that decision.
- A proposal that starts at `[0,` falls under D8.

Line numbers drift as files change, so match on the key and the class.

| key | line | class | px (current) | kind | proposed |
|---|---|---|---|---|---|
| `text.body` | text.ts:9 | `density-text-[sm,base,lg]` | 14/16/18 | 3-affine | **F: f = 12/14/16/18/20 → [xs,sm,base,lg,xl]** |
| `text.small` | text.ts:11 | `density-text-[xs,sm,base]` | 12/14/16 | 3-affine | **F: f − 2 = 10/12/14/16/18 → needs `--text-2xs` (10px)** |
| `text.title` | text.ts:13 | `density-text-[base,lg,xl]` | 16/18/20 | 3-affine | **D5 (headings/combinator)** |
| `text.h3` | text.ts:15 | `density-text-[lg,xl,2xl]` | 18/20/24 | 3-NONAFFINE | **D5 (headings/combinator)** |
| `text.h2` | text.ts:17 | `density-text-[xl,2xl,3xl]` | 20/24/30 | 3-NONAFFINE | **D5 (headings/combinator)** |
| `text.h1` | text.ts:19 | `density-text-[2xl,3xl,4xl]` | 24/30/36 | 3-affine | **D5 (headings/combinator)** |
| `text.chip` | text.ts:21 | `density-text-[xs,sm,base,lg,lg]` | 12/14/16/18/18 | 5-xl-repeat | **F: f = 12/14/16/18/20 → [xs,sm,base,lg,xl]** |
| `text.combinator` | text.ts:23 | `density-text-[xs,xs,sm,base,base]` | 12/12/14/16/16 | 5-NONAFFINE | **D5 (headings/combinator)** |
| `size` | size.ts:11 | `density-size-[4,5,6]` | 16/20/24 | 3-affine | **F: `inner` const — split: check.box = I (D4), row.base = I** |
| `size.icon.base` | size.ts:16 | `density-size-[3,4,5,6,6]` | 12/16/20/24/24 | 5-xl-repeat | **F: I = f + 4 (D4)** |
| `size.icon.slot` | size.ts:18 | `*:data-[slot=icon]:density-size-[3,4,5,6,6]` | 12/16/20/24/24 | 5-xl-repeat | **F: I = f + 4 (D4)** |
| `size.icon.row.slot` | size.ts:27 | `*:data-[slot=icon]:density-size-[4,5,6]` | 16/20/24 | 3-affine | **F: I = f + 4 (folds into icon.slot once rows are 5-step)** |
| `size.icon.row.spinner` | size.ts:29 | `*:data-[slot=loading-spinner]:density-size-[4,5,6]` | 16/20/24 | 3-affine | **F: I = f + 4 (folds into icon.slot once rows are 5-step)** |
| `size.dot` | size.ts:33 | `density-size-[1,1.5,2,2.5,2.5]` | 4/6/8/10/10 | 5-xl-repeat | `[1,1.5,2,2.5,3]` |
| `size.avatar.base` | size.ts:36 | `density-size-[7,9,11]` | 28/36/44 | 3-affine | `[5,7,9,11,13]` |
| `size.avatar` | size.ts:42 | `[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*,[data-slot=sidebar-item]>:not([data-density=slot])>[data-slot=avatar-with-status]>*)]:density-size-[5,6,7]` | 20/24/28 | 3-affine | **F: I + 4 (sidebar avatar, −m-0.5 → occupies I)** |
| `size.swatch.base` | size.ts:46 | `density-size-[1.5,2,2.5,3,4]` | 6/8/10/12/16 | 5-NONAFFINE | `design` |
| `size.swatch.line` | size.ts:48 | `density-w-[2,2.5,3,3.5,4]` | 8/10/12/14/16 | 5-affine | `keep` |
| `size.check.mark` | size.ts:52 | `density-size-[3,3.5,4]` | 12/14/16 | 3-affine | **F: I − 4 = 12/14/16/18/20** |
| `size.radio.dot` | size.ts:61 | `density-size-[1,1.5,2]` | 4/6/8 | 3-affine | `[0.5,1,1.5,2,2.5]` |
| `size.thumb.base` | size.ts:65 | `density-size-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `size.colorPanel.preview` | size.ts:69 | `density-size-[8,9,10]` | 32/36/40 | 3-affine | `[7,8,9,10,11]` |
| `size.colorPanel.area` | size.ts:71 | `density-h-[32,40,48]` | 128/160/192 | 3-affine | `[24,32,40,48,56]` |
| `size.colorPanel.channel` | size.ts:73 | `density-h-[3,3.5,4]` | 12/14/16 | 3-affine | `[2.5,3,3.5,4,4.5]` |
| `size.colorPanel.width` | size.ts:75 | `density-w-[72,80,88]` | 288/320/352 | 3-affine | `[64,72,80,88,96]` |
| `size.colorPanel.fields` | size.ts:80 | `density-h-[21.75,27.75,34.25]` | 87/111/137 | 3-NONAFFINE | `design` |
| `size.gauge` | size.ts:83 | `density-size-[12,16,20]` | 48/64/80 | 3-affine | `[8,12,16,20,24]` |
| `size.button.base` | size.ts:86 | `density-h-[5.5,7.5,9.5,11.5,11.5]` | 22/30/38/46/46 | 5-xl-repeat | **F: L + 2·py = 26/32/38/44/50** |
| `size.button.width` | size.ts:88 | `density-w-[16,20,24,28,28]` | 64/80/96/112/112 | 5-xl-repeat | `[16,20,24,28,32]` |
| `size.button.icon` | size.ts:90 | `density-size-[4.5,6,7.5,9,9]` | 18/24/30/36/36 | 5-xl-repeat | **F: I + 2·bare = 22/26/30/34/38** |
| `size.pagination` | size.ts:93 | `density-size-[5.5,7.5,9.5,11.5,11.5]` | 22/30/38/46/46 | 5-xl-repeat | **F: = button.base** |
| `size.badge.base` | size.ts:96 | `density-h-[5.5,6.5,7.5,8.5,8.5]` | 22/26/30/34/34 | 5-xl-repeat | **F: L(chip) + 2·3 = 26/28/30/32/34** |
| `size.badge.width` | size.ts:98 | `density-w-[10,12,14,16,16]` | 40/48/56/64/64 | 5-xl-repeat | `[10,12,14,16,18]` |
| `size.control.base` | size.ts:107 | `density-h-[7.5,9.5,11.5]` | 30/38/46 | 3-affine | **F: = button.base** |
| `size.control.min` | size.ts:109 | `density-min-w-[16,24,32]` | 64/96/128 | 3-affine | `[8,16,24,32,40]` |
| `size.line.base` | size.ts:113 | `density-h-[4,5,6]` | 16/20/24 | 3-affine | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.line.small` | size.ts:115 | `density-h-[3,4,5]` | 12/16/20 | 3-affine | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.line.text` | size.ts:120 | `data-density:density-h-[4,5,6,7,7]` | 16/20/24/28/28 | 5-xl-repeat | **F: L of Text size** |
| `size.line.tiny` | size.ts:122 | `density-h-[2,3,4]` | 8/12/16 | 3-affine | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.line.title.base` | size.ts:125 | `density-h-[6,7,8]` | 24/28/32 | 3-affine | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.line.title.large` | size.ts:127 | `density-h-[7,8,9]` | 28/32/36 | 3-affine | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.line.timeline` | size.ts:130 | `density-h-[6,7,7]` | 24/28/28 | 3-NONAFFINE | **F: L of the text it stands for — derive, then skeleton-parity proves it** |
| `size.stat.value.base` | size.ts:135 | `density-h-[8,9,10]` | 32/36/40 | 3-affine | **F: L of stat value text (h1 ramp, D5)** |
| `size.stat.value.width` | size.ts:137 | `density-w-[16,20,24]` | 64/80/96 | 3-affine | `[12,16,20,24,28]` |
| `size.row` | size.ts:141 | `density-h-[5,6,7]` | 20/24/28 | 3-affine | **F: L = 20/22/24/26/28** |
| `size.segment.base` | size.ts:144 | `density-h-[8,10,12]` | 32/40/48 | 3-affine | **F: L(small) + 2·segment py** |
| `size.segment.width` | size.ts:146 | `density-w-[40,48,56]` | 160/192/224 | 3-affine | `[32,40,48,56,64]` |
| `size.tab.width` | size.ts:150 | `density-w-[14,16,20]` | 56/64/80 | 3-NONAFFINE | `design` |
| `size.switch.width` | size.ts:154 | `density-w-[8,10,12]` | 32/40/48 | 3-affine | `[6,8,10,12,14]` |
| `size.slider.track` | size.ts:158 | `density-h-[1,1.5,2]` | 4/6/8 | 3-affine | `[0.5,1,1.5,2,2.5]` |
| `size.sparkline.base` | size.ts:162 | `density-h-[6,8,10]` | 24/32/40 | 3-affine | `[4,6,8,10,12]` |
| `size.sparkline.width` | size.ts:164 | `density-w-[18,24,30]` | 72/96/120 | 3-affine | `[12,18,24,30,36]` |
| `size.calendar.width` | size.ts:168 | `density-w-[52,68,80]` | 208/272/320 | 3-NONAFFINE | `design` |
| `size.chart` | size.ts:171 | `density-h-[40,60,80]` | 160/240/320 | 3-affine | `[20,40,60,80,100]` |
| `size.tree.indent` | size.ts:174 | `density-w-[4,5,6]` | 16/20/24 | 3-affine | **F: I (chevron column)** |
| `size.resize.handle` | size.ts:178 | `density-w-[2,4,6]` | 8/16/24 | 3-affine | `[0,2,4,6,8]` |
| `size.menu.max` | size.ts:182 | `density-max-h-[48,52,56]` | 192/208/224 | 3-affine | `[44,48,52,56,60]` |
| `space.p.xs` | space.ts:14 | `density-p-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.p.sm` | space.ts:15 | `density-p-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.p.md` | space.ts:16 | `density-p-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.p.lg` | space.ts:17 | `density-p-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.p.xl` | space.ts:18 | `density-p-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.px.xs` | space.ts:21 | `density-px-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.px.sm` | space.ts:22 | `density-px-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.px.md` | space.ts:23 | `density-px-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.px.lg` | space.ts:24 | `density-px-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.px.xl` | space.ts:25 | `density-px-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.py.xs` | space.ts:28 | `density-py-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.py.sm` | space.ts:29 | `density-py-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.py.md` | space.ts:30 | `density-py-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.py.lg` | space.ts:31 | `density-py-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.py.xl` | space.ts:32 | `density-py-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.py` | space.ts:37 | `density-p-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.box.bottom` | space.ts:46 | `density-pb-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.card.header.bottom` | space.ts:51 | `not-last:density-pb-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.card.footer.top` | space.ts:58 | `&]:density-pt-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `space.popover` | space.ts:76 | `density-p-[3,4,6]` | 12/16/24 | 3-NONAFFINE | `design` |
| `space.panel.flush` | space.ts:88 | `density-mb-[-3,-4,-5]` | -12/-16/-20 | 3-affine | `[-2,-3,-4,-5,-6]` |
| `space.panel.above` | space.ts:90 | `not-first:density-mt-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.panel.top` | space.ts:92 | `density-pt-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.panel.bottom` | space.ts:94 | `density-pb-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.panel.first.drawer` | space.ts:106 | `first:not-in-[[data-slot=drawer]_:not(:first-child)]:density-mt-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.panel.first.sheet` | space.ts:107 | `first:not-in-[[data-slot=sheet]_:not(:first-child)]:density-mt-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.panel.last.drawer` | space.ts:115 | `last:not-in-[[data-slot=drawer]_:not(:last-child)]:density-mb-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.panel.last.sheet` | space.ts:116 | `last:not-in-[[data-slot=sheet]_:not(:last-child)]:density-mb-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `space.shell.base` | space.ts:134 | `density-p-[4,6,8]` | 16/24/32 | 3-affine | `[2,4,6,8,10]` |
| `space.shell.x` | space.ts:136 | `density-px-[4,6,8]` | 16/24/32 | 3-affine | `[2,4,6,8,10]` |
| `space.shell.bottom` | space.ts:138 | `density-pb-[4,6,8]` | 16/24/32 | 3-affine | `[2,4,6,8,10]` |
| `space.shell.top.lg` | space.ts:141 | `lg:density-pt-[4,6,8]` | 16/24/32 | 3-affine | `[2,4,6,8,10]` |
| `space.shell.top.headless` | space.ts:143 | `lg:not-has-[[data-slot=header]]:density-pt-[4,6,8]` | 16/24/32 | 3-affine | `[2,4,6,8,10]` |
| `space.tooltip` | space.ts:147 | `density-p-ring-[1,2,3]` | 3/7/11 | 3-affine | `[0,1,2,3,4]` |
| `space.combinator.base` | space.ts:150 | `density-p-ring-[1.5,1.5,2,2.5,2.5]` | 5/5/7/9/9 | 5-NONAFFINE | `design` |
| `space.combinator.label` | space.ts:152 | `data-has-label:density-py-ring-[1,1,1.5,2,2]` | 3/3/5/7/7 | 5-NONAFFINE | `design` |
| `space.button.base` | space.ts:156 | `density-p-ring-[1.5,2,2.5,3,3]` | 5/7/9/11/11 | 5-xl-repeat | `[1.5,2,2.5,3,3.5]` |
| `space.button.label` | space.ts:158 | `data-has-label:density-py-ring-[1,1.5,2,2.5,2.5]` | 3/5/7/9/9 | 5-xl-repeat | `[1,1.5,2,2.5,3]` |
| `space.button.bare` | space.ts:160 | `not-data-has-label:density-p-[0.75,1,1.25,1.5,1.5]` | 3/4/5/6/6 | 5-xl-repeat | `[0.75,1,1.25,1.5,1.75]` |
| `space.sidebar.item.label` | space.ts:167 | `data-has-label:density-py-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.badge.base` | space.ts:172 | `density-px-ring-[1,1.5,2,2.5,2.5]` | 3/5/7/9/9 | 5-xl-repeat | `[1,1.5,2,2.5,3]` |
| `space.badge.pill` | space.ts:174 | `density-px-ring-[1.5,2,2.5,3,3]` | 5/7/9/11/11 | 5-xl-repeat | `[1.5,2,2.5,3,3.5]` |
| `space.badge.removable` | space.ts:176 | `data-has-suffix:density-ps-ring-[2.25,3,3.75,4.5,4.5]` | 8/11/14/17/17 | 5-xl-repeat | `[2.25,3,3.75,4.5,5.25]` |
| `space.control.x` | space.ts:180 | `density-px-ring-[2.5,3,3.5]` | 9/11/13 | 3-affine | `[2,2.5,3,3.5,4]` |
| `space.control.y` | space.ts:182 | `density-py-ring-[1.5,2,2.5]` | 5/7/9 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.affix.prefix` | space.ts:186 | `density-ps-ring-[2.5,3,3.5,3.5,3.5]` | 9/11/13/13/13 | 5-NONAFFINE | `design` |
| `space.affix.suffix` | space.ts:188 | `density-pe-ring-[2.5,3,3.5,3.5,3.5]` | 9/11/13/13/13 | 5-NONAFFINE | `design` |
| `space.affix.bare` | space.ts:192 | `has-[[data-variant=bare]:not([data-has-label])]:density-ps-ring-[1.75,2,2.25,2.25,2.25]` | 6/7/8/8/8 | 5-NONAFFINE | `design` |
| `space.affix.bare` | space.ts:195 | `has-[[data-variant=bare]:not([data-has-label])]:density-pe-ring-[1.75,2,2.25,2.25,2.25]` | 6/7/8/8/8 | 5-NONAFFINE | `design` |
| `space.autofill.prefix` | space.ts:200 | `group-has-[[data-slot=prefix]]/control:autofill:density-ms-ring-[2.5,3,3.5]` | 9/11/13 | 3-affine | `[2,2.5,3,3.5,4]` |
| `space.autofill.suffix` | space.ts:202 | `group-has-[[data-slot=suffix]]/control:autofill:density-me-ring-[2.5,3,3.5]` | 9/11/13 | 3-affine | `[2,2.5,3,3.5,4]` |
| `space.slot.prefix` | space.ts:206 | `density-ms-[1.5,2,2.5,2.5,2.5]` | 6/8/10/10/10 | 5-NONAFFINE | `design` |
| `space.slot.suffix` | space.ts:208 | `density-me-[1.5,2,2.5,2.5,2.5]` | 6/8/10/10/10 | 5-NONAFFINE | `design` |
| `space.tags.y` | space.ts:212 | `density-py-ring-[2,2.5,3,3,3]` | 7/9/11/11/11 | 5-NONAFFINE | `design` |
| `space.list.plain.x` | space.ts:217 | `density-px-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.row.y` | space.ts:222 | `density-py-[1,1.5,2]` | 4/6/8 | 3-affine | `[0.5,1,1.5,2,2.5]` |
| `space.option.x` | space.ts:226 | `density-px-[2,2.5,3]` | 8/10/12 | 3-affine | `[1.5,2,2.5,3,3.5]` |
| `space.option.y` | space.ts:228 | `density-py-[1,1.5,2.5]` | 4/6/10 | 3-NONAFFINE | `design` |
| `space.menu.item.x` | space.ts:233 | `density-px-[2.5,3,3.5]` | 10/12/14 | 3-affine | `[2,2.5,3,3.5,4]` |
| `space.segment.item.x` | space.ts:239 | `density-px-[2.5,3,4]` | 10/12/16 | 3-NONAFFINE | `design` |
| `space.tab.bottom` | space.ts:246 | `density-pb-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.tab.pill.y` | space.ts:251 | `density-py-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.tab.skeleton.bottom` | space.ts:255 | `density-mb-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.tab.skeleton.start` | space.ts:257 | `density-ms-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.tab.skeleton.end` | space.ts:259 | `density-me-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.tab.skeleton.y` | space.ts:261 | `density-my-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.slider.track.y` | space.ts:269 | `density-my-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.tree.indent` | space.ts:274 | `density-ps-[5,7,9]` | 20/28/36 | 3-affine | `[3,5,7,9,11]` |
| `space.timeline.bottom` | space.ts:278 | `density-pb-[6,8,10]` | 24/32/40 | 3-affine | `[4,6,8,10,12]` |
| `space.timeline.top` | space.ts:280 | `density-pt-[6,8,10]` | 24/32/40 | 3-affine | `[4,6,8,10,12]` |
| `space.calendar.header.bottom` | space.ts:285 | `density-mb-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.resize.end` | space.ts:290 | `[&>*>tr>th[data-resizable]]:density-pe-[2,4,6]` | 8/16/24 | 3-affine | `[0,2,4,6,8]` |
| `space.term.top` | space.ts:294 | `[&>dt]:density-pt-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.term.row.bottom` | space.ts:297 | `sm:[&>dt]:density-pb-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.term.stacked.top` | space.ts:301 | `[&>dt]:density-pt-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.detail.bottom` | space.ts:306 | `[&>dd]:density-pb-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.detail.row.top` | space.ts:309 | `sm:[&>dd]:density-pt-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `space.detail.stacked.top` | space.ts:313 | `[&>dd]:density-pt-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.field.label` | space.ts:318 | `*:not([data-slot=description]))]:density-mb-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.field` | space.ts:321 | `*:not([data-slot=description]))]:density-mb-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.field.description` | space.ts:323 | `[data-slot]]:density-mt-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `space.field` | space.ts:326 | `[data-slot]]:density-mt-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.field.list` | space.ts:328 | `[data-slot]]:density-mt-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.field` | space.ts:331 | `:is([data-slot=message],[role=alert])]:density-mt-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.fieldset.legend` | space.ts:335 | `*]:density-pt-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.fieldset.field` | space.ts:337 | `[data-slot=field]]:density-mt-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `space.fieldset.label` | space.ts:339 | `[data-slot=field]]:density-mt-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `space.mark.x` | space.ts:343 | `density-px-[1,1.5,2]` | 4/6/8 | 3-affine | `[0.5,1,1.5,2,2.5]` |
| `space.kbd.button.x` | space.ts:350 | `[&:is([data-variant]>*)]:density-px-[1,1.5,1.5]` | 4/6/6 | 3-NONAFFINE | `design` |
| `space.kbd.button.y` | space.ts:352 | `[&:is([data-variant]>*)]:density-py-[0,0.5,0.5,0.5,0.5]` | 0/2/2/2/2 | 5-NONAFFINE | `design` |
| `gap.xs` | gap.ts:13 | `density-gap-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `gap.sm` | gap.ts:14 | `density-gap-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `gap.md` | gap.ts:15 | `density-gap-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `gap.lg` | gap.ts:16 | `density-gap-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `gap.xl` | gap.ts:17 | `density-gap-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `gap.xs` | gap.ts:22 | `density-gap-x-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `gap.sm` | gap.ts:23 | `density-gap-x-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `gap.md` | gap.ts:24 | `density-gap-x-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `gap.lg` | gap.ts:25 | `density-gap-x-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `gap.xl` | gap.ts:26 | `density-gap-x-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `gap.xs` | gap.ts:31 | `density-gap-y-[0.5,1,1.5]` | 2/4/6 | 3-affine | `[0,0.5,1,1.5,2]` |
| `gap.sm` | gap.ts:32 | `density-gap-y-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `gap.md` | gap.ts:33 | `density-gap-y-[2,3,4]` | 8/12/16 | 3-affine | `[1,2,3,4,5]` |
| `gap.lg` | gap.ts:34 | `density-gap-y-[3,4,5]` | 12/16/20 | 3-affine | `[2,3,4,5,6]` |
| `gap.xl` | gap.ts:35 | `density-gap-y-[5,6,7]` | 20/24/28 | 3-affine | `[4,5,6,7,8]` |
| `gap.item` | gap.ts:112 | `density-gap-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `gap.option` | gap.ts:114 | `density-gap-[2,3,3]` | 8/12/12 | 3-NONAFFINE | `design` |
| `gap.loose` | gap.ts:116 | `density-gap-[2,4,6]` | 8/16/24 | 3-affine | `[0,2,4,6,8]` |
| `gap.datePicker` | gap.ts:118 | `density-gap-[2.25,2.75,3.25]` | 9/11/13 | 3-affine | `[1.75,2.25,2.75,3.25,3.75]` |
| `gap.control` | gap.ts:124 | `density-gap-[0.75,1,1.25]` | 3/4/5 | 3-affine | `[0.5,0.75,1,1.25,1.5]` |
| `gap.button` | gap.ts:126 | `density-gap-[0.75,1,1.25,1.5,1.5]` | 3/4/5/6/6 | 5-xl-repeat | `[0.75,1,1.25,1.5,1.75]` |
| `gap.badge` | gap.ts:128 | `density-gap-[0.5,0.75,1,1.25,1.25]` | 2/3/4/5/5 | 5-xl-repeat | `[0.5,0.75,1,1.25,1.5]` |
| `gap.dots` | gap.ts:130 | `density-gap-[0.5,1,1.5,2,2]` | 2/4/6/8/8 | 5-xl-repeat | `[0.5,1,1.5,2,2.5]` |
| `gap.rating` | gap.ts:132 | `density-gap-[0.5,0.5,1]` | 2/2/4 | 3-NONAFFINE | `design` |
| `radius.control` | radius.ts:9 | `density-rounded-[1.5,2,2.5]` | 6/8/10 | 3-affine | `[1,1.5,2,2.5,3]` |
| `radius.button` | radius.ts:11 | `density-rounded-[1,1.5,2,2.5,2.5]` | 4/6/8/10/10 | 5-xl-repeat | `[1,1.5,2,2.5,3]` |
| `radius.combinator` | radius.ts:13 | `density-rounded-[1,1,1.5,2,2]` | 4/4/6/8/8 | 5-NONAFFINE | `design` |
| `radius.tooltip` | radius.ts:15 | `density-rounded-[1,2,3]` | 4/8/12 | 3-affine | `[0,1,2,3,4]` |
| `radius.card` | radius.ts:17 | `density-rounded-[sm,md,lg]` | ?/?/? | name? | `` |
| `radius.check` | radius.ts:19 | `density-rounded-[0.75,1,1.25]` | 3/4/5 | 3-affine | `[0.5,0.75,1,1.25,1.5]` |
