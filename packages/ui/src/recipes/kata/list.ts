import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, iro, ji, kasane, kokkaku, narabi, omote, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { cursor, disabled, fg, grab, tint } = hannou
const { on, text } = iro
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, divider, focus } = sen

/** The `variant` axis of the list: the keys that the recipe of the root declares. */
export type ListVariant = NonNullable<VariantProps<typeof base>['variant']>

const base = defineRecipe({
	base: [flex.col, 'm-0 p-0'],
	variant: {
		separated: [dan.gap.scale.sm],
		outline: ['overflow-hidden', rounded.lg, ...border.default, ...divider.between],
		plain: divider.between,
		solid: [dan.gap.scale.sm],
		bare: [dan.gap.scale.sm],
	},
	// A horizontal row wraps onto the next line when its items do not fit, so it
	// stays inside a narrow parent.
	orientation: {
		horizontal: 'flex-row flex-wrap',
		vertical: '',
	},
	defaults: { variant: 'separated', orientation: 'vertical' },
})

// The padding of a row follows the nearest density scope. The card-like
// variants use the uniform `dan.space.box.base` padding, and `plain` uses a tighter
// ratio (`dan.space.list.plain.x` and `dan.space.row.y`). A `bare` row has no
// padding, because its content is a control with a frame of its own.
const pad = dan.space.box.base

// The rounded wash layer of a divided row. The layer takes no pointer, so a
// press still reaches the row and its slots.
const roundedWash = [
	'relative isolate',
	'before:absolute before:inset-0.5 before:-z-10 before:pointer-events-none before:rounded-lg',
]

const item = defineRecipe({
	// `list-none` is stated, not inherited from the flex display: a row only avoids
	// drawing a marker today because `display: flex` generates no marker box, so a
	// future non-flex variant would grow a bullet.
	base: [
		'group',
		'list-none',
		flex.row,
		dan.gap.scale.sm,
		'gap-y-0',
		size.md,
		text.default,
		focus.inset,
	],
	variant: {
		separated: [...bg.surface, border.default, rounded.lg, pad],
		outline: pad,
		plain: `${dan.space.list.plain.x} ${dan.space.row.y}`,
		solid: [...bg.tint, border.default, rounded.lg, pad],
		bare: '',
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
	// Opt-in corners for the wash, for the variants that carry none. `separated`
	// and `solid` are rounded already, so this adds nothing there; `false` never
	// strips them, because a variant's own shape is not this axis's to take away.
	// The classes ride the compounds below, because only the divided variants
	// need them.
	rounded: {
		true: '',
		false: '',
	},
	compound: [
		// A divided row keeps square corners: `divide-y` draws each divider as the
		// row's bottom border, and a rounded row bends that line up at both ends. The
		// wash moves to a rounded `::before` layer, set in from the row so that it
		// clears the dividers. `isolate` makes the row a stacking context, so the
		// layer at `-z-10` paints over the row's own fill and under its content,
		// and never under a parent's fill.
		{ variant: 'plain', rounded: true, class: roundedWash },
		{ variant: 'outline', rounded: true, class: roundedWash },
		// The hover wash, one per variant, because each rests on a different fill and
		// a wash is a background *replacement*. It rides the `<li>` rather than the
		// content column so it covers the prefix and suffix slots too — a row that
		// lights up under the label alone reads as two targets.
		//
		// A row on bare ground takes the standard wash, doubled inside a glass
		// parent where 5% sits under the panel's own translucency.
		{ variant: 'plain', interactive: true, rounded: false, class: [tint.base, tint.glass.base] },
		{ variant: 'outline', interactive: true, rounded: false, class: [tint.base, tint.glass.base] },
		{ variant: 'plain', interactive: true, rounded: true, class: [tint.before, tint.glass.before] },
		{
			variant: 'outline',
			interactive: true,
			rounded: true,
			class: [tint.before, tint.glass.before],
		},
		// A card rests on an opaque surface, and an alpha wash would not darken it
		// but replace it — the row would go see-through to whatever it covers for
		// as long as the pointer rests there. It steps shade instead.
		{ variant: 'separated', interactive: true, class: tint.surface },
		// A solid row rests on `omote.bg.tint`, which the standard wash matches in
		// strength — the hover would repaint the rest state. This doubles it.
		{ variant: 'solid', interactive: true, class: tint.filled },
	],
	defaults: {
		variant: 'separated',
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
	// `text-start` is for the `as="button"` content area: the UA centers button
	// text, and a row's label/description column never wants that. `focus.ring`
	// paints the keyboard-focus indicator for the whole row: an activatable content
	// area is natively focusable, so it — not the `<li>` around it — is the row's
	// one focus target, reorderable or not.
	base: [flex.col, 'flex-1 min-w-0 text-start', focus.ring],
	// One rung across the whole axis, not a `variant` × `interactive` compound:
	// `on.wash.muted` is legal on the page surface and on `solid`'s wash alike.
	interactive: {
		true: [on.wash.muted, fg.hover, ...cursor],
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
	// pointer-capturing `::after` — the inverse of the overlay in `kasane.layers`,
	// which adds `pointer-events-none` to stop exactly this — pulls the painted row into
	// the one click and hover target, cursor and text step included. The `<li>` is
	// the containing block, so `item.stretched` rides with it.
	stretched: {
		true: 'after:absolute after:inset-0',
		false: '',
	},
	defaults: { interactive: false, lifted: false, stretched: false },
})

export const k = {
	base,
	item,
	handle: [
		flex.inline,
		'flex-none justify-center',
		'px-3 -mx-3',
		...grab.default,
		'data-disabled:cursor-not-allowed',
		...mode(
			'text-zinc-500 not-data-disabled:hover:text-zinc-700',
			'dark:text-zinc-500 dark:not-data-disabled:hover:text-zinc-200',
		),
		...disabled,
	],
	/**
	 * Content column. Pass three flags:
	 *
	 * - whether the row acts on activation (`href` or `onClick`)
	 * - whether the row is currently picked up for a keyboard move
	 * - whether its hit area covers the whole row
	 */
	content,
	label: 'min-w-0 truncate',
	// `on.wash.muted`, not `muted`: the `solid` variant grounds a row on the
	// wash, which `muted` is not legal over. See `iro/ramp.ts`.
	description: ['min-w-0 truncate', size.sm, on.wash.muted],
	skeleton: kokkaku.list,
} as const
