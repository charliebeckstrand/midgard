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
import { defineScale } from '../../core/density'
import { defineRecipe } from '../../core/recipe'
import { iro, ji, omote } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { size } = ji
const { rail } = omote

// Cell padding for each step.
const padding = [dan.space.cell.x, dan.space.cell.y]

const cell = defineRecipe({
	base: [text.default, padding],
})

// A browser centers a `<th>` through its own stylesheet, and the `text-start` of
// the table does not reach it. So the header states its alignment, as a cell does.
const header = defineRecipe({
	base: ['text-start font-bold', text.muted, padding],
})

/**
 * Table-side projections onto descendant cells. Cells and headers are
 * static leaves that carry only their own padding steps. The `<table>` element
 * sets the outline-, stripe-, and hover-varying properties on them. No
 * descendant therefore reads context, and the whole family renders in React
 * Server Components. The exact-depth child chains (`>*>tr>` walks
 * thead/tbody/tfoot) keep a nested table's cells independent.
 *
 * The `hover` scopes to `tbody` rows only, because the head holds no data. It
 * washes at the 5% `hannou.tint` value, an interactive variant that
 * out-cascades the non-interactive 2.5% `striped` wash on the hovered row.
 *
 * Tailwind scans whole class literals. These rows can't be interpolated
 * from the unprefixed values they mirror (`sen.border.subtle`, with its
 * `contrast-more` step),
 * or from each other (the `odd`/`even` `striped` parity below). Keep them in
 * step by hand.
 */
const projection = {
	outline: [
		'[&>*>tr>:is(td,th)]:border',
		'[&>*>tr>:is(td,th)]:border-zinc-950/5',
		'dark:[&>*>tr>:is(td,th)]:border-white/5',
		'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
		'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
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
	// The scroll container. While the table overflows, the edge with more
	// columns behind it fades, and the container is a tab stop with an inset ring.
	scroll: [...rail],
	base: 'w-full text-start text-base',
	// Color only. A `border.color.subtle` sat here with no border *width*, so it
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

/** The size scale of {@link Table}: the steps of its cell padding. */
export const scale = defineScale(dan.space.cell.x, dan.space.cell.y)
