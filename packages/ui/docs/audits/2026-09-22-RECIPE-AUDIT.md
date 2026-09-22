# Recipe Audit

Survey of the `packages/ui` recipe system (2026-09-22): the engine in `core/recipe/`, the three layers under
`recipes/` (kiso, katakana, kata), and the 311 files that read a kata. The question is whether a simpler
design removes moving parts. The candidates were an established framework such as Panda CSS, a radical
redesign with its own identity, and a sharper version of the in-house engine.

Ten read-only sweeps mapped the system: the engine, kiso, katakana, two halves of kata, the consumers, the
guardrails, the history, the external frameworks, and CSS-native directions. The sweeps counted with scripts
rather than by eye, compiled every proposed CSS syntax against the installed Tailwind 4.3.0, and benchmarked
each runtime candidate on the real Button kata. A design panel of five competing redesigns started next, and a
usage limit stopped it before any design finished. The "refine" design left a working prototype engine, seven
exemplar kata, and equivalence proofs; this audit uses that evidence and marks it as partial. The other four
designs left no output, so their rows below rest on the mapping sweeps alone.

## Answer

Do not adopt a framework. Panda, StyleX, vanilla-extract, and Pigment compile style objects, so none of them
can read a Tailwind class string. Adoption means a rewrite of about 1,585 unique utility tokens and a second
CSS engine in every app. tailwind-variants and CVA do read Tailwind strings, but on Button they measured
34–38 µs and 2.6–3.6 µs per call against 0.12–0.48 µs for this engine, and this repository already adopted
and dropped both.

The engine logic is not the problem; multiplication is. Variant × colour × mode × size lives as hand-expanded
class strings, spread across three layers and six different variant mechanisms. The recurring bugs live in
that string contract, not in the engine.

The recommendation is an in-house redesign in three tiers, named here **Kanna** (鉋, the plane that shaves a
board to a true surface). Tier 1 keeps the hard constraints and removes most of the moving parts. Tier 2
reopens one settled decision — the package ships no CSS — on new evidence, and it is where colour becomes
cheap. Tier 3 moves component styles into the cascade and deletes tailwind-merge; it is the radical end state,
and this audit holds it back.

## Measured

| Surface | Today |
|---|---|
| Engine (`core/recipe/**`) | 420 code lines; 13 exports; three caches with `cn` and tailwind-merge |
| kiso | 138 files, 3,819 lines, 130 exports, about 490 leaves, 15 Japanese module names plus 5 semantic bundles |
| katakana + `applyRecipe` | 582 lines serving 15 call sites in 12 kata |
| kata | 94 files, about 6,400 lines, three shapes of `k` |
| Consumers | 311 files; 869 runtime `k` references, of which 149 call a recipe and 631 read a static value |
| Guards and prose | 2,010 lines of lint, boundary, and recipe tests; 539 lines of prose in five overlapping documents |

The engine census over 135 authored `defineRecipe` calls: `base` 125, `defaults` 116, a boolean axis 26,
`extras` 15, `skeleton` 12, `compound` 10, `slots` 7, and `palette` 4. Twenty-one calls declare no axis at
all. `applyRecipe` has two call sites. No production code reads `.config`. Slot pre-merge changes 0 of 36 slot
values. Of 192 axes, 16 hold only empty strings and exist to key compound rules.

The mechanical checks were not rerun for this audit, because it changes no code. The September simplification
audit recorded them clean.

## Diagnosis

**The engine carries features that few recipes use.** Four recipes use `palette`, and only 19 of 143 recipe
instances contain a class conflict that tailwind-merge must resolve. The flat config shape mixes axes with
reserved fields, so `defaults` and `compound` are untyped: `defaults: { sizee: 'md' }` compiles. Palette
splicing silently drops an explicit `color` axis. Axis declaration order is merge semantics, so `text.ts`
changes output if a reader reorders two keys. `slots`, `skeleton`, `extras`, and `.config` are four channels
for one job: to attach a property to the recipe.

**Colour multiplies.** The iro palette is a colour × role table that kiso expands by hand into 75 standard and
112 extended class cells. `definePalette` then expands those into compound rules: 112 of the 136 compound
rules in the first kata half are palette pairs, and Button alone carries 45. Twelve more kata write their own
zinc / red / amber / green / blue tables, and their shades have drifted (amber is 600/500 in `progress`,
500/400 in `text`, 500/500 in `slider`). The tree already holds the better pattern: `kiso/slider/color.ts`,
`control/check.ts`, `kata/switch.ts`, and `kata/checkbox.ts` set one CSS variable per colour and read it.

**The bridge layer is ceremony.** Each katakana bridge always receives the same single kiso bundle, and no
test calls a bridge with other tokens. The "no kiso types" rule forces each bridge to spell `Step` again,
which breaks CONVENTIONS §4.4. `applyRecipe` types an overridden axis as an intersection while the runtime
replaces it, so its types accept values that paint nothing. A sweep inlined all 15 call sites and found 0
runtime mismatches over every combination, with `Equal<VariantProps>` assertions that a negative control
proved can fail.

**Six mechanisms resolve a variant.** Recipe axes, indexed tables (`k.x[key]`, 75 reads), `cond && k.x` and
ternaries, exported functions (`heading`, `status`, `group.frame`), data- and aria- selectors inside class
strings (377 of them), and a separate responsive system (581 lines in `box` / `flex` / `split`). State axes
repeat attributes that the components already stamp: 23 sites send a value to the recipe and to a `data-*`
attribute. Twenty-two orientation tables flow through React context although six roots already stamp
`data-orientation`.

**Most tokens rename one utility.** About 150 kiso leaves alias a single Tailwind class (`weight.semibold` is
`font-semibold`), and the kata bypass them anyway: 78 raw `gap-*` literals stand beside one `ma.gap` reader.
Five exports and 44 leaves have no reader. Fifty-two of 130 exports have one reader, which breaks kiso's own
"two consumers" rule; 23 of the 24 kokkaku skeleton entries are among them.

**Merge and cache work against each other.** Three caches overlap: the recipe memo (the slowest hit, because
it joins a string key), the `cn` trie, and the tailwind-merge LRU. The `cn` trie rejects array arguments, and
410 kata leaves are arrays, so 337 of 679 `cn` calls bypass it; 98 of those are in `modules/grid`. Of the `cn`
calls, 225 have one argument, and 166 of those exist only to flatten an array.

**The string contract is where the bugs live.** The history sweep grouped the recipe fixes by cause. The
causes are classes the scanner cannot see, classes that do not exist (`text-md`), selectors keyed on
attributes that no component sets (`group-data-[glass]`, `data-disabled`, the `data-has-label` oscillation),
compound rules and defaults that fail silently, and focus, disabled, and contrast state (21, 10, and 8 fix
commits). jsdom compiles no Tailwind, so the class assertions (111 `toHaveClass` and 347 `className` checks)
pass against dead rules.

**The guards police the layering, not the product.** Of 2,010 guard lines, 314 exist only because of the kiso
/ katakana / kata split, and some of them do not catch what they claim. The kiso direction override misses
sibling-relative imports, the grit plugin misses the `core/recipe/engine` path and namespace imports, and
`recipe-import-boundary.test.ts` repeats what `verbatimModuleSyntax` already enforces (TS1484). The prose
drifts: the docs cite three boundary tests that do not exist, name `iro.spectrum` and a `mist` colour that do
not exist, and give four different lists of barrel exports.

## Design — Kanna

### The model

Kanna rests on three ideas. Each one removes a family of parts rather than adding a layer.

1. **One kata shape.** A kata is a plain object of parts. A part is a string, a recipe, or data such as a
   skeleton or a motion config. The three shapes of `k`, the `slots` / `skeleton` / `extras` channels, and the
   bridge layer go away.

2. **Colour is a tone, not a variant.** A hue sets the role variables of its row in one hue × role table
   (`fill`, `wash`, `edge`, `ink`, …); a variant only reads roles (`bg-(--iro-fill)`). Colour and variant
   become independent axes, so their product disappears: V + C entries replace V × C compound rules, and a new
   hue is one row.

3. **Attributes are state.** A component stamps what it knows (`data-orientation`, `data-active`,
   `aria-current`), and a class string keys on it. The recipe keeps only appearance choices that a caller
   makes: variant, colour, size.

The vocabulary shrinks to match. `kiso` holds only tokens that encode a decision, `kata` holds one object per
unit, `iro` is the tone table, and `kanna` is the engine. `katakana`, the alias modules (`ji`, `narabi.flex`,
`shaku` dimension maps, `omote.blur`, `ugoki.css`, `kasane.rounded`), and the kokkaku folder retire. Whether
the Japanese names stay is an owner decision (D2); the model does not depend on them.

### Tier 1 — inside the hard constraints

The engine is one primitive and one join helper. Axes nest under `variants`, so `compound` and `defaults`
type against the declared axes. A `true` key makes an axis boolean with no empty `false` branch. A compound
condition takes a list to match any member. The recipe joins its classes and does not merge them. A property test proves
`twMerge(out) === out` for every declared combination, so tailwind-merge runs once, at the consumer
`className` boundary in `cn`. The memo is an array indexed by a mixed-radix number, which bounds it by the
declared combinations and needs no cap.

```ts
type Classes = string | false | null | undefined | readonly Classes[]
type Axis = { readonly [value: string]: Classes } // a `true` key makes the axis boolean
type Variants = { readonly [axis: string]: Axis }

function defineRecipe<V extends Variants>(spec: {
	base?: Classes
	variants?: V
	compound?: readonly NoInfer<Compound<V>>[] // typed against V; a list matches any member
	defaults?: NoInfer<Props<V>> // typed against V
}): (props?: Props<V>) => string // a plain join

function cx(...inputs: Classes[]): string // joins once, at definition
```

Button under Tier 1, taken from the prototype and shortened. The palette block, `definePalette`, the
extended-palette spread, and the 45 palette compounds are gone. The skeleton is plain data on the kata object.

```ts
const variant = {
	solid: cx(focus.ring, paint.solid, hover.solid), // paints read --iro-* roles
	soft: cx(focus.inset, paint.soft, hover.soft),
	outline: cx('ring-1', focus.inset, paint.outline, hover.outline),
	plain: cx(focus.inset, paint.plain, hover.plain),
	bare: cx(focus.inset, paint.bare, hover.bare),
}

export const k = {
	root: defineRecipe({
		base: [
			'relative isolate touch-manipulation inline-flex items-center justify-center w-fit shrink-0',
			'font-semibold',
			disabled,
			cursor,
		],
		variants: {
			variant,
			color: { ...iro.tone(variant), inherit: iro.inherit }, // per hue: setters for the roles these paints read
			size: { xs: […], sm: […], md: […], lg: […] },
		},
		compound: [{ variant: 'bare', size: 'xs', class: 'not-data-[has-label]:p-0.75' } /* sm, md, lg */],
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
	}),
	skeleton: { base: 'rounded-lg', size: { xs: 'h-6 w-16', sm: 'h-7 w-20', md: 'h-9 w-24', lg: 'h-11 w-28' } },
}

export type ButtonVariants = VariantProps<typeof k.root>
```

Under Tier 1 the tone setters are Tailwind arbitrary-property literals
(`[--iro-fill:var(--color-red-600)] dark:[--iro-ink:var(--color-red-400)]`). Every literal stays scannable,
and the package still ships no CSS. The cost is payload: the setters grow a chromatic element's class string
by about 450 characters. Tier 2 removes that cost.

### Tier 2 — ship one stylesheet

`packages/ui/src/styles.css` carries `@source './'` and the rules that class strings carry badly today.
`packages/shared/src/globals.css` imports it, so both apps get it with no edit, and the docs `app.css` and the
browser-test `tailwind.css` add one import each. `@source` inside an imported sheet resolves against that
sheet, and a nested `@variant dark` resolves against each entry's own dark definition: the media query in the
apps and the `.dark` class in the docs. The mapping sweep compiled all of the following against Tailwind
4.3.0.

```css
@source './';

@custom-variant enabled (&:not(:disabled, [data-disabled])); /* one disabled gate, 11 spellings today */

@utility p-ring-* { padding: calc(--spacing(--value(number)) - 1px); } /* replaces kasane padding tables */

@property --paint-bg { syntax: '*'; inherits: false; }

@layer components {
	[data-tone='red'] {
		--iro-fill: var(--color-red-600);
		--iro-ink: var(--color-red-700);
		@variant dark { --iro-ink: var(--color-red-400); }
	}

	[data-k]:where([data-variant='soft']) {
		--paint-bg: --alpha(var(--iro-wash) / 15%);
		--paint-fg: var(--iro-ink);
	}
}
```

With the tone as an attribute, a chromatic class string shrinks below today's length, because one
`bg-(--paint-bg)` serves every variant and every hue. A tone inherits by design, so `<div data-tone="red">`
tints each descendant that sets no tone of its own. That replaces Button's synthetic `inherit` colour. The
stylesheet also gives the missing keyframes and the docs-only focus rule a home in the package (R1, R10).

### Tier 3 — styles in the cascade (held back)

The end state authors component declarations in `@layer components` with `:where()` selectors, keyed by one
hook per part. A consumer utility then wins by layer, whatever its specificity, so tailwind-merge, the `cn`
trie, and the recipe memo all go. Tier 3 alone fixes stateful overrides: today
`twMerge('bg-zinc-600 not-disabled:not-data-disabled:hover:bg-zinc-700', 'bg-red-500 hover:bg-red-600')` keeps
the recipe's hover, which wins on specificity (verified). Tier 3 stays held back. Intra-recipe "later wins"
semantics decide 793 of 2,588 combinations today, 458 class assertions pin class strings, and CSS composition
has no import graph and no type check. Revisit Tier 3 after Tier 2, and only if override defects keep
arriving.

## Evidence from the prototype

The refine design built the engine, seven exemplar kata, and proofs in scratch before the limit stopped it.
The scratch files are not part of this change; the numbers below come from their runs.

The engine is 109 code lines against 420 today. `tsc` accepts its type proof, and a negative control that
expects a wrong type fails as it must (TS2344).

Runtime equivalence compared the resolved classes of the old and new kata for every declared combination:

| Unit | Combinations | Mismatches |
|---|---|---|
| Badge | 1,575 | 0 |
| list (`item`, `root`, `content`, `handle`, `description`) | 4,904 | 0 |
| table (13 parts and projections) | 13 | 0 |
| Button | 300 | 25 — every miss is the `inherit` colour, which the prototype had not yet ported |

Tabs and Dialog did not finish: Tabs failed at runtime on a missing scratch token, and Dialog failed `tsc` on
a boolean axis. The property test, the contrast-guard port, and the Tier 2 stylesheet have no prototype.

Hot path, Button, on Node 22 in this container (one run, indicative only):

| Call | Current engine | Kanna |
|---|---|---|
| `k({ variant, color, size })` | 175 ns | 124 ns |
| Rotating `size` | 361 ns | 139 ns |
| `k()` with no props | 12 ns | 45 ns |

Both engines clear the 0.5 µs gate. The no-props path is slower because the memo array is sparse; a memo sized
up front at creation removes that gap. For reference, tailwind-variants 3.3.1 measured 34–38 µs and CVA 1.0
beta with tailwind-merge 2.6–3.6 µs on the same kata.

Payload, Button with `color: 'red'`, Tier 1 literal tones: 707–788 characters today against 1,136–1,172 with
the setters. Tier 2 attribute tones remove the setters.

## Open

Each row is one pull request. Tier 1 rows need no owner decision beyond the direction itself; Tier 2 rows need
D1.

**R1 — Fix four live defects.** `kata/progress.ts:94` animates with `progress-indeterminate` keyframes that no
file defines, so the indeterminate bar does not move; animate it with `motion` as the determinate fill does,
or define the keyframes under R10. `hannou/fg.ts:14` and `hannou/nav.ts:21` omit the `data-disabled` gate that
`iro/hover.ts:6-16` requires. `components/button/button.tsx:103` stamps `data-variant={variant}`, which is
`undefined` under the default. `menu-item.tsx:68` and `menu-sub.tsx:339` repeat the `group/option` that
`kata/menu.ts:22` already holds.

*Open.*

**R2 — Take the no-regret cleanups.** Delete the dead kiso tokens (about 110 literals: `ma.m/mx/my`,
`shaku.combobox/listbox`, `kasane.gap.gx/gy`, both `outline.border` maps, and others), the dead axes and slots
(`table` cell and header `density` / `outline`, the `timeline` root `variant`, breadcrumb `current`,
color-picker `icon` / `placeholder`, dialog's unread panel keys, `close` in every panel kata), and the dead
twMerge spacing extension (`core/tw-merge.ts:8-12`; no `p-md` class exists). Replace the 21 zero-axis recipes
with strings. Delete `recipe-import-boundary.test.ts`. Fix the doc drift.

*Open.*

**R3 — Delete katakana and `applyRecipe`.** Inline the 15 call sites; the mapping sweep proved runtime and
type equivalence. This removes 582 lines, the katakana biome override, both `Step` re-spellings, and
`katakana/README.md`. Four kata that hand-copy the control axis pack read one shared config from
`kiso/control` instead.

*Open.*

**R4 — Replace the engine with Kanna.** Nest the axes, type `compound` and `defaults`, drop `slots` / `extras`
/ `skeleton` / `.config`, and key the memo by index. First restructure the 19 conflict-bearing recipes
(`list.item`, `textarea`, `text`, `badge`, and `input` hold 717 of the 793 conflicting combinations). Then add
the property test and codemod the 135 calls. The geometry tests read a `specOf(recipe)` symbol in place of
`.config`. The gate is per-recipe equivalence over every combination, `tsc` on all three programs, the full
suite, and the recipe bench.

*Open.*

**R5 — One kata shape.** Pre-join every leaf to one string at definition, which lets every `cn` argument hit
the memo and turns 225 single-argument `cn(k…)` calls into `className={k.x}`. Move each kokkaku entry into its
kata as `k.skeleton` data (524 lines in 25 files; `createSkeleton` keeps its contract).

*Open.*

**R6 — Make colour a tone.** Rewrite iro as one hue × role table with a `tone(paints)` helper that derives a
colour axis from the roles its paints read. Delete `definePalette`, `expandPalette`, `basePalette`, `shades`,
the iro variant tables, the extended-palette copy, and 112 palette compound rules. Move the switch, slider,
checkbox, progress, chart, and grid colour tables onto the same roles. Port `contrast.test.ts` to read the
tone table; it measures each hue × role × mode, which is simpler than today's regex over class literals.
Without D1 this row costs about 450 characters per chromatic element; with D1 it lands as R10's attribute
tones instead.

*Open.*

**R7 — Move state and orientation to attributes.** Delete the state-like boolean axes (`list` `active` /
`lifted` / `interactive`, pagination `current`, the scrollbar state, stepper `interactive`) and the
orientation tables. Parts key on the root with `group-data-[orientation=vertical]/<name>:`, and context stays
only where behaviour reads it. Replace the 46 compound rules on all-empty axes (`scroll-area` 21, `swatch` 15,
`menu` 3) with nested lookups.

*Open.*

**R8 — Put kiso on a diet.** Keep the tokens that encode a decision: iro tones, `sen.focus`, `hannou` states,
`kasane` chrome, `ugoki` motion data, and `sou`. Drop the single-utility aliases (about 150 leaves) and fold
the one-reader bundles (`segment`, `popover.trigger`) into their kata. Give the interactive row one shared
config; `menu`, `option`, `nav`, `sidebar`, and `tree` define it five times today.

*Open.*

**R9 — Consolidate the guards and the prose.** Keep one recipe document and link to code for inventories.
Merge the four funnel overrides in `biome.json` into one, fix or delete the kiso direction override, and match
the grit plugin on the call expression. Let the affix and tag-input geometry tests read numeric tokens instead
of parsing `calc(--spacing(n))` strings back into numbers.

*Open.*

**R10 — Ship `ui/styles.css` (needs D1).** Add `@source './'`, the `enabled` custom variant, `p-ring-*` /
`r-ring-*` utilities for kasane, the `sou` z-ladder as `@theme --z-index-*`, a `--color-focus` token, the
missing keyframes, the global `:focus:not(:focus-visible)` rule that only the docs app carries today, and the
tone and paint blocks with `@property` registration. Scope the attribute selectors (`[data-k]`) so they cannot
match shadcn or Base UI markup. Add a test that each of the four Tailwind entries imports the sheet, because a
missing import renders components unstyled with no build error.

*Open.*

**R11 — Carry Density as custom properties (needs D1).** Density, Glass, and Affix set inherited custom
properties on the `display: contents` wrappers that already exist, and sized leaves read `p-(--ui-pad)`
instead of calling `useDensity` (39 calls). Custom properties keep the nearest-scope-wins semantics that
ancestor attribute selectors cannot give. More leaves then render as server components.

*Open.*

## Decisions for the owner

**D1 — Reopen "the package ships no CSS."** Commit `4afc3cd8c` removed the only stylesheet. New evidence
argues for one. The package already depends on CSS it does not ship: `sen/focus.ts:42-43` relies on a rule in
`docs/engine/app.css:13-16` that the apps lack, and the progress keyframes exist nowhere. Tier 2 costs one
file and four imports, and it is where colour, kasane, the disabled gate, and Density become cheap.
Recommendation: yes.

**D2 — Keep or retire the Japanese names.** The layer names read as one metaphor and give the system identity;
the 15 atom names cost a newcomer 15 glosses and give no search hint. Recommendation: keep `kiso`, `kata`,
`iro`, and name the engine `kanna`; retire `katakana` and the alias modules with their names.

**D3 — Decide the public style-prop contract.** The 46 derived `*Variants` types leak internal axes (`glass`,
`density`, `surface`, `scale`), eight sites strip them with `Omit`, and the apps reference none of them.
Recommendation: derive the types from `k.root`, but mark internal axes so the public type omits them.

**D4 — Accept the conflict-free contract.** Under Kanna a recipe joins and never merges, and one property test
keeps it honest. Recommendation: yes; tailwind-merge then runs only where a consumer `className` meets the
recipe.

## Adjacent issues

**The contrast guard measures a different theme than the apps ship.** `packages/shared/src/theme.css:2` sets
`--color-white` to 98% lightness while the guard measures against `#fff`, and `theme.css:3` points
`--color-black` at `--color-black-500`, which nothing defines. `ring-black/10` and `ring-black/25` read that
token in the apps.

**Consumer overrides of stateful classes lose today.** tailwind-merge keeps a recipe's gated `hover:` class
beside a consumer's `hover:`, and the recipe wins on specificity. Only Tier 3 fixes this class of defect.

**`HeadlessProvider` is an internal escape hatch.** Only Button and Input read it, eight internal sites wrap
it, and `button-headless.tsx` repeats the anchor / button branch logic. Unstyled `ButtonBase` and `InputBase`
primitives remove it.

**Group joins stamp props with `cloneElement`.** `use-group.ts:54-79` stamps position props that nine
components forward. Structural selectors can replace it, with low confidence until wrappers and skeleton swaps
are checked.

## Ruled out

**Panda CSS.** Config recipes take style objects, so every Tailwind literal needs a rewrite (about 1,585
unique tokens: 310 `dark:`, 421 state variants, 532 arbitrary values). Each app gains codegen and a second CSS
engine. Runtime Density needs `staticCss: ['*']` or the CSS goes missing without an error. v2, a Rust compiler
rewrite, has been in beta since June 2026, so an adoption now means a second migration. The own engine came
from a branch named for Panda research (PR #391), but no rejection reason was ever committed; this row is that
record.

**tailwind-variants.** The API matches the engine almost field for field, but it rebuilds a compound signature
on every call: 34–38 µs on Button against 124–175 ns. The repository adopted it on 2026-04-18 and dropped it
on 2026-05-20.

**CVA.** Version 1.0 is a moving beta (betas 9–12 between 2026-09-06 and 2026-09-17, with API removals), it
has no memo (2.6–3.6 µs), and the repository dropped it once. Its `base:` cascade custom variant is the idea
Tier 3 borrows.

**StyleX, vanilla-extract, Pigment.** Each is a compile-time non-Tailwind system with a Babel or bundler
plugin per app. Pigment is on hold.

**Data-attribute variants as the only mechanism.** Tailwind sorts a variant-prefixed utility after a bare one,
and tailwind-merge keeps both, so a consumer `bg-red-500` loses to `data-[variant=solid]:bg-zinc-600`
(verified). Attributes set variables in Kanna; they do not carry the property-setting utility.

**`light-dark()`, relative colour for inks, style queries, `if()`.** `light-dark()` follows `color-scheme`,
which neither dark definition sets. Relative colour moves inks off the rungs the contrast guard measures.
Style queries became Baseline only in May 2026, and `if()` ships in Chromium alone.

**cnfast.** It is a byte-identical tailwind-merge drop-in that is faster only on cold merges, and it is three
months old. Watch it; do not adopt it.

## Settled ground this audit reopens

The history sweep listed the settled decisions. This audit keeps "every class a full literal", "RSC-pure
resolution", "one `k` per unit", "twMerge at the consumer boundary", "`size` means the density step", and
"never repeat an axis union". It reopens four, each on evidence:

- "The package ships no CSS" — D1, on the docs-only focus rule and the missing keyframes.
- "katakana imports nothing from kiso" — R3 deletes the layer, because the injection never varies.
- "Skeleton is a reserved recipe field" — R5 makes it plain data on the kata object; `createSkeleton` keeps
  its contract.
- "`basePalette` and `definePalette` compose" — R6 deletes both, because a tone channel removes the matrix
  they build.

## Totals

Eleven open rows and four owner decisions. The line counts below are estimates from the sweeps, except where a
prototype measured them; the September audit showed that an estimate from uncompiled drafts is not a
measurement.

Tier 1 removes, at the high end: the engine from 420 to about 110 code lines; katakana and `applyRecipe` (582
lines); the palette subsystem (about 500 lines across `engine/palette.ts`, the iro variant tables,
`basePalette`, and `shades`); about 158 of 195 compound rules; about 150 alias leaves and 110 dead literals;
314 lines of layering guards; and about 400 lines of layering prose. It also removes the concepts behind them:
three kata shapes become one, four property channels become one, the six variant mechanisms narrow to three
(recipe axes, attributes, and tones), and 15 kiso module names become about six.

Justify the change by the bug classes it removes, not by lines. The history sweep put the recurring defects in
the string contract. Kanna addresses them at the source: typed `compound` and `defaults` fail at compile time,
the property test catches silent conflicts, the tone table puts contrast data in one place, and attributes
that a component stamps are the attributes its classes read.
