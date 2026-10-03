/**
 * Table kata: object-literal surface for the bare `<Table>` element and its
 * cells. The `cell` and `header` sub-recipes carry the leaf styling. Their
 * padding steps are `density-*` classes. A cell takes the step of its nearest
 * density scope. That scope is the `<table>` when it has a `size`, else the
 * scope around it. The `projection` holds the outline-, stripe-, and hover-varying
 * child selectors the `<table>` casts onto descendants. Cells therefore read no
 * context, and the family renders in RSC. `head`, `row`, and `empty` are
 * static slots.
 */
import { defineRecipe } from '../../core/recipe'
import { iro, ji, sen } from '../kiso'

const { text } = iro
const { size } = ji
const { border, focus } = sen

// Cell padding for each step.
const padding = ['density-px-[1,2,3]', 'density-py-[1,2,3]']

const outline = {
	true: border.subtle,
	false: '',
}

const cell = defineRecipe({
	base: [text.default, padding],
	outline,
	defaults: { outline: false },
})

// A browser centers a `<th>` through its own stylesheet, and the `text-start` of
// the table does not reach it. So the header states its alignment, as a cell does.
const header = defineRecipe({
	base: ['text-start font-bold', text.muted, padding],
	outline,
	defaults: { outline: false },
})

/**
 * Table-side projections onto descendant cells. Cells and headers are
 * static leaves carrying their own padding steps. The table overrides the
 * outline-, stripe-, and hover-varying properties from the `<table>` element.
 * No descendant therefore reads context, and the whole family renders in React
 * Server Components. The exact-depth child chains (`>*>tr>` walks
 * thead/tbody/tfoot) keep a nested table's cells independent.
 *
 * The `hover` scopes to `tbody` rows only, because the head holds no data. It
 * washes at the 5% `hannou.tint` value, an interactive variant that
 * out-cascades the non-interactive 2.5% `striped` wash on the hovered row.
 *
 * Tailwind scans whole class literals. These rows can't be interpolated
 * from the unprefixed values they mirror (`sen.border.subtle`),
 * or from each other (the `odd`/`even` `striped` parity below). Keep them in
 * step by hand.
 */
const projection = {
	outline: [
		'[&>*>tr>td]:border',
		'[&>*>tr>td]:border-zinc-950/5',
		'dark:[&>*>tr>td]:border-white/5',
		'[&>*>tr>th]:border',
		'[&>*>tr>th]:border-zinc-950/5',
		'dark:[&>*>tr>th]:border-white/5',
	],
	striped: {
		odd: [
			'[&>tbody>tr:nth-child(odd)]:bg-zinc-950/2.5',
			'dark:[&>tbody>tr:nth-child(odd)]:bg-white/2.5',
		],
		even: [
			'[&>tbody>tr:nth-child(even)]:bg-zinc-950/2.5',
			'dark:[&>tbody>tr:nth-child(even)]:bg-white/2.5',
		],
	},
	hover: ['[&>tbody>tr]:hover:bg-zinc-950/5', 'dark:[&>tbody>tr]:hover:bg-white/5'],
} as const

export const k = {
	// The scroll container is a tab stop while the table overflows. An outset
	// ring would sit outside the box and stretch the page, so the ring is inset.
	scroll: ['overflow-x-auto', focus.inset],
	base: 'w-full text-start text-base',
	// Color only. A `border.subtleColor` sat here with no border *width*, so it
	// painted nothing: the shipped header carries no rule. Restoring one is a
	// visual change, not a cleanup — it needs a width and a design call.
	head: [text.muted],
	// Above the table and aligned to the start, with the muted color of the head.
	caption: ['caption-top text-start pb-2', size.sm, text.muted],
	// A summary row group. It takes no style of its own; a caller sets the weight of a totals row.
	foot: [],
	header,
	row: [],
	cell,
	projection,
	empty: ['text-center', text.muted],
}
