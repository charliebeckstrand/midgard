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
import { defineKata, mode } from '../../core/recipe'
import { dan, iro, ji, omote } from '../kiso'

const { text } = iro
const { size } = ji
const { rail } = omote

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

/**
 * The cell rules of `outline`. Each line paints once, at one weight and one
 * color. The color comes from `gridline`, in the weights of `sen.outline` on
 * Card and Box.
 *
 * The rule color is translucent. Where two rules paint the same pixel, the
 * alphas add, and the pixel shows darker in light mode and lighter in dark
 * mode. Collapsed all-sides borders (`border-collapse: collapse`) paint each
 * junction twice, once for the horizontal rule and once for the vertical
 * rule. Thus the table uses `border-collapse: separate` with no spacing, and
 * no two cells share a rule. Each cell draws its inline-end and bottom rule.
 * The first row of the first row group draws the top edge, and the first cell
 * of each row draws the inline-start edge. The sides are logical, so a
 * right-to-left table mirrors them.
 *
 * Each rule is on a cell and not on the `<table>`. Thus a sticky header or a
 * frozen column (Grid) moves with its rules. A collapsed border stays on the
 * table, and it scrolls out from under a sticky cell.
 *
 * A cell with a `rowspan` in the first column moves the first cell of each
 * row that it spans. Those rows then draw their inline-start edge on an
 * interior line.
 *
 * The top rule names its cells (`:is(td,th)`) and does not use `*`. A
 * `:first-child` compound followed by `>*` makes Chromium restyle each child
 * of every element whose `:first-child` state changes, on all pages
 * (`panel-inset-restyle` holds this).
 */
const rule = [
	'border-separate border-spacing-0',
	'[&>*>tr>:is(td,th)]:border-e',
	'[&>*>tr>:is(td,th)]:border-b',
	'[&>:nth-child(1_of_thead,tbody,tfoot)>tr:first-child>:is(td,th)]:border-t',
	'[&>*>tr>*:first-child]:border-s',
]

/**
 * The color of the cell rules, in the three weights of `sen.outline`. The
 * `<table>` casts each color onto its cells as an all-sides `border-color`,
 * and `rule` sets which sides show.
 *
 * Tailwind finds only whole class literals. Thus these rows cannot be built
 * from the unprefixed `sen.outline` colors and the `contrastMore.border` step
 * that they mirror. Keep them in step by hand.
 */
const gridline = {
	/** Default rule: low-contrast palette, as `sen.outline.default`. */
	default: mode(
		[
			'[&>*>tr>:is(td,th)]:border-zinc-950/10',
			'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
		],
		[
			'dark:[&>*>tr>:is(td,th)]:border-white/10',
			'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
		],
	),
	/** Stronger rule, as `sen.outline.strong`. */
	strong: mode(
		[
			'[&>*>tr>:is(td,th)]:border-zinc-950/15',
			'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
		],
		[
			'dark:[&>*>tr>:is(td,th)]:border-white/15',
			'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
		],
	),
	/** Subtle rule, as `sen.outline.subtle`. */
	subtle: mode(
		[
			'[&>*>tr>:is(td,th)]:border-zinc-950/5',
			'contrast-more:[&>*>tr>:is(td,th)]:border-zinc-950/50',
		],
		[
			'dark:[&>*>tr>:is(td,th)]:border-white/5',
			'dark:contrast-more:[&>*>tr>:is(td,th)]:border-white/50',
		],
	),
} as const

export const k = defineKata({
	base: ['w-full text-start', size.md],
	// `true` selects the default weight, and a name selects another weight.
	outline: {
		true: [...rule, ...gridline.default],
		false: '',
		subtle: [...rule, ...gridline.subtle],
		strong: [...rule, ...gridline.strong],
	},
	stripe: projection.striped,
	hover: { true: projection.hover, false: '' },
	slots: {
		// The scroll container. While the table overflows, the edge with more
		// columns behind it fades, and the container is a tab stop with an inset ring.
		// The container is `relative`, so it is the containing block of each
		// absolute box in a cell, such as the `sr-only` label of an actions
		// header. Without it, such a box is not clipped by the scroll, and it
		// widens the box around the table past its edge.
		// A table with `bleed` runs into the padding of its parent on each side.
		scroll: {
			scrolls: { true: ['relative', ...rail], false: '' },
			bleed: { true: '-mx-4 sm:-mx-6', false: '' },
		},
		// Color only. A `border.color.subtle` sat here with no border *width*, so it
		// painted nothing: the shipped header carries no rule. Restoring one is a
		// visual change, not a cleanup: it needs a width and a design call.
		head: [text.muted],
		// Above the table and aligned to the start, with the muted color of the head.
		caption: ['caption-top text-start pb-2', size.sm, text.muted],
		// A browser centers a `<th>` through its own stylesheet, and the `text-start` of
		// the table does not reach it. So the header states its alignment, as a cell does.
		header: ['text-start', 'font-bold', text.muted, padding],
		cell: [text.default, padding],
		empty: ['text-center', text.muted],
	},
})

/** The size scale of {@link Table}: the steps of its cell padding. */
export const scale = defineScale(dan.space.cell.x, dan.space.cell.y)
