import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, ma, narabi, omote, sen, steps } from '../kiso'

const { cursor, disabled, fg, glassItem, tint, tintFilled, tintSurface } = hannou
const { text } = iro
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
	base: ['group', flex.row, 'gap-2', 'gap-y-0', size.md, text.default, focus.inset],
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
		true: focus.lifted,
		false: '',
	},
	// Whether the row acts on activation. It carries no classes of its own: the
	// wash a row takes depends on the fill it already has, so it rides the
	// variant compounds below and this axis only gates them.
	interactive: {
		true: '',
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
		rounded: false,
	},
})

// The `interactive` axis carries the treatment for a content area that acts on
// activation — navigate (`href`) or fire an `onClick` (cf. breadcrumb's
// non-current link).
const content = defineRecipe({
	// `text-left` is for the `as="button"` content area: the UA centres button
	// text, and a row's label/description column never wants that. `focus.ring`
	// paints the only keyboard-focus indicator a row can get — in a non-sortable
	// list the `<li>` takes no `tabIndex`, so its own `focus.inset` never fires and
	// this content area is the sole focus target.
	base: [flex.col, 'flex-1 min-w-0 text-left', focus.ring],
	interactive: {
		true: [text.muted, fg.hover, ...cursor],
		false: '',
	},
	defaults: { interactive: false },
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
	/** Content column. Pass whether the row acts on activation (`href` or `onClick`). */
	content: (interactive?: boolean) => content({ interactive }),
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', size.sm, text.muted],
} as const
