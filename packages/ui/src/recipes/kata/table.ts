/**
 * Table kata: the unit of the bare `<Table>` element and its cells. The
 * `header` and `cell` slots carry the leaf styling. Their padding steps are
 * `density-*` classes. A cell takes the step of its nearest density scope.
 * That scope is the `<table>` when it has a `size`, else the scope around it.
 * The `outline`, `stripe`, and `hover` axes of the root slot hold the child
 * selectors that the `<table>` casts onto its descendants. Cells therefore
 * read no context, and the family renders in RSC. The `scrolls` axis of
 * `scroll` gives the scroll box, and `head`, `caption`, and `empty` are static
 * slots.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, ji, omote, sen } from '../kiso'

const { text } = iro
const { size } = ji
const { rail } = omote
const { gridline } = sen

// Cell padding for each step.
const padding = [dan.space.cell.x, dan.space.cell.y]

/**
 * The axes of the table that project onto its descendant cells. Cells and headers are
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
 * Tailwind scans whole class literals. The `odd` and `even` `striped` rows
 * therefore cannot be built from each other. Keep them in step by hand.
 */
const projection = {
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

// The all-sides rule of each cell under `outline`. The color comes from
// `sen.gridline`, in the weights of `sen.outline` on Card and Box.
const rule = '[&>*>tr>:is(td,th)]:border'

export const k = defineKata({
	base: 'w-full text-start text-base',
	// `true` selects the default weight, and a name selects another weight.
	outline: {
		true: [rule, ...gridline.default],
		false: '',
		subtle: [rule, ...gridline.subtle],
		strong: [rule, ...gridline.strong],
	},
	stripe: projection.striped,
	hover: { true: projection.hover, false: '' },
	slots: {
		// The scroll container. While the table overflows, the edge with more
		// columns behind it fades, and the container is a tab stop with an inset ring.
		scroll: { scrolls: { true: [...rail], false: '' } },
		// Color only. A `border.color.subtle` sat here with no border *width*, so it
		// painted nothing: the shipped header carries no rule. Restoring one is a
		// visual change, not a cleanup: it needs a width and a design call.
		head: [text.muted],
		// Above the table and aligned to the start, with the muted color of the head.
		caption: ['caption-top text-start pb-2', size.sm, text.muted],
		// A browser centers a `<th>` through its own stylesheet, and the `text-start` of
		// the table does not reach it. So the header states its alignment, as a cell does.
		header: ['text-start font-bold', text.muted, padding],
		cell: [text.default, padding],
		empty: ['text-center', text.muted],
	},
})

/** The size scale of {@link Table}: the steps of its cell padding. */
export const scale = defineScale(dan.space.cell.x, dan.space.cell.y)
