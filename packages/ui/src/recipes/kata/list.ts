import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, ma, narabi, omote, sen, steps } from '../kiso'

const { cursor, disabled, fg, glassItem, tint, tintFilled, tintSurface } = hannou
const { onWash, text } = iro
const { size } = ji
const { rounded } = kasane
const { p } = ma
const { flex } = narabi
const { bg } = omote
const { border, divider, focus } = sen

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const root = defineRecipe({
	base: [flex.col, 'm-0 p-0'],
	variant: {
		separated: ['gap-2'],
		outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
		plain: divider.between,
		solid: ['gap-2'],
	},
	orientation: {
		horizontal: 'flex-row',
		vertical: '',
	},
	defaults: { variant: 'separated', orientation: 'vertical' },
})

// The card-like variants share the uniform `ma.p` scale across the density
// axis; `plain` uses a tighter px/py ratio.
const variants = ['separated', 'outline', 'solid'] as const

const item = defineRecipe({
	// `list-none` is stated, not inherited from the flex display: a row only avoids
	// drawing a marker today because `display: flex` generates no marker box, so a
	// future non-flex variant — or a row lifted into a `<DragOverlay>`, which renders
	// outside the `<ul>` preflight strips — would grow a bullet.
	base: ['group', 'list-none', flex.row, 'gap-2', 'gap-y-0', size.md, text.default, focus.inset],
	variant: {
		separated: [...bg.surface, border.default, rounded.lg],
		outline: '',
		plain: '',
		solid: [...bg.tint, border.default, rounded.lg],
	},
	// Density carries no padding itself: row padding rides the variant × density
	// compounds below, so tailwind-merge keeps a later `px`/`py` (the `plain`
	// rows) over an earlier `p`.
	density: { sm: '', md: '', lg: '' },
	active: {
		true: ['z-10 relative', ...bg.surface, rounded.md],
		false: '',
	},
	lifted: {
		true: [...focus.lifted.raise, focus.lifted.ring],
		false: '',
	},
	// Whether the row acts on activation. It carries no classes of its own: the
	// wash a row takes depends on the fill it already has, so it rides the
	// variant compounds below and this axis only gates them.
	interactive: {
		true: '',
		false: '',
	},
	// Whether the content column's hit area covers the whole row. The row turns
	// into the containing block for that overlay (see `content.stretched`), and
	// every slot beside the content column steps over it — a drag handle or a
	// trailing control stays pressable. `z-index` alone does that: a flex item
	// takes one while it stays static, so the slots need no `position` of their
	// own, and a consumer's `prefix` keeps whatever containing block it had.
	stretched: {
		true: ['relative', '[&>*:not([data-slot=list-item-content])]:z-10'],
		false: '',
	},
	// Opt-in corners, for the variants that carry none. `separated` and `solid`
	// are rounded already, so this adds nothing there; `false` never strips them,
	// because a variant's own shape is not this axis's to take away.
	rounded: {
		true: rounded.lg,
		false: '',
	},
	compound: [
		...variants.flatMap((variant) =>
			steps.map((density) => ({ variant, density, class: p[density] })),
		),
		{ variant: 'plain', density: 'sm', class: 'px-1.5 py-1' },
		{ variant: 'plain', density: 'md', class: 'px-2 py-1.5' },
		{ variant: 'plain', density: 'lg', class: 'px-2.5 py-2' },
		// The hover wash, one per variant, because each rests on a different fill and
		// a wash is a background *replacement*. It rides the `<li>` rather than the
		// content column so it covers the prefix and suffix slots too — a row that
		// lights up under the label alone reads as two targets.
		//
		// A row on bare ground takes the standard wash, doubled inside a glass
		// parent where 5% sits under the panel's own translucency.
		{ variant: 'plain', interactive: true, class: [tint, glassItem] },
		{ variant: 'outline', interactive: true, class: [tint, glassItem] },
		// A card rests on an opaque surface, and an alpha wash would not darken it
		// but replace it — the row would go see-through to whatever it covers for
		// as long as the pointer rests there. It steps shade instead.
		{ variant: 'separated', interactive: true, class: tintSurface },
		// A solid row rests on `omote.bg.tint`, which the standard wash matches in
		// strength — the hover would repaint the rest state. This doubles it.
		{ variant: 'solid', interactive: true, class: tintFilled },
	],
	defaults: {
		variant: 'separated',
		density: 'md',
		active: false,
		lifted: false,
		interactive: false,
		stretched: false,
		rounded: false,
	},
})

// The `interactive` axis carries the treatment for a content area that acts on
// activation — navigate (`href`) or fire an `onClick` (cf. breadcrumb's
// non-current link).
const content = defineRecipe({
	// `text-left` is for the `as="button"` content area: the UA centres button
	// text, and a row's label/description column never wants that. `focus.ring`
	// paints the keyboard-focus indicator for the whole row: an activatable content
	// area is natively focusable, so it — not the `<li>` around it — is the row's
	// one focus target, reorderable or not.
	base: [flex.col, 'flex-1 min-w-0 text-left', focus.ring],
	// One rung across the whole axis, not a `variant` × `interactive` compound:
	// `onWash.muted` is legal on the page surface and on `solid`'s wash alike.
	interactive: {
		true: [onWash.muted, fg.hover, ...cursor],
		false: '',
	},
	// Picked up for a keyboard move. The row's own `lifted` raises and shadows it;
	// the accent belongs here, on whatever is actually focused — the same kiso
	// declaration the row's ring takes, in the shape this element's indicator uses.
	lifted: {
		true: focus.lifted.outline,
		false: '',
	},
	// Whether the hit area covers the whole row. This column is only `flex-1`, so
	// the row's padding, the gaps, and the prefix / suffix chrome sit outside it,
	// and a press on any of that reached the `<li>`, which acts on nothing. A
	// pointer-capturing `::after` — the inverse of `kasane.layers.overlay`, which
	// adds `pointer-events-none` to stop exactly this — pulls the painted row into
	// the one click and hover target, cursor and text step included. The `<li>` is
	// the containing block, so `item.stretched` rides with it.
	stretched: {
		true: 'after:absolute after:inset-0',
		false: '',
	},
	defaults: { interactive: false, lifted: false, stretched: false },
})

export const k = {
	root,
	item,
	handle: [
		flex.inline,
		'flex-none justify-center',
		'px-3 -mx-3',
		'cursor-grab data-readonly:cursor-default data-disabled:cursor-not-allowed',
		'touch-none select-none',
		...mode(
			'text-zinc-500 not-data-disabled:not-data-readonly:hover:text-zinc-700',
			'dark:text-zinc-500 dark:not-data-disabled:not-data-readonly:hover:text-zinc-200',
		),
		...disabled,
	],
	/**
	 * Content column. Pass whether the row acts on activation (`href` or
	 * `onClick`), whether the row is currently picked up for a keyboard move, and
	 * whether its hit area covers the whole row.
	 */
	content,
	label: 'min-w-0 truncate',
	// `onWash.muted`, not `muted`: the `solid` variant grounds a row on the
	// wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: ['min-w-0 truncate', size.sm, onWash.muted],
} as const
