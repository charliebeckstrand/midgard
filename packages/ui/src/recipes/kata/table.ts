/**
 * Table kata: object-literal surface for the bare `<Table>` element and its
 * cells. The `cell` and `header` sub-recipes carry the density/outline leaf
 * styling. The `projection` holds the density-, outline-, stripe-, and
 * hover-varying child selectors the `<table>` casts onto descendants. Cells
 * therefore read no context, and the family renders in RSC. `head`, `row`, and
 * `empty` are static slots.
 */
import { defineRecipe } from '../../core/recipe'
import { iro, sen } from '../kiso'

const { text } = iro
const { border } = sen

const density = {
	sm: 'px-1 py-1',
	md: 'px-2 py-2',
	lg: 'px-3 py-3',
}

const outline = {
	true: border.subtle,
	false: '',
}

const cell = defineRecipe({
	base: [text.default],
	density,
	outline,
	defaults: { density: 'md', outline: false },
})

const header = defineRecipe({
	base: ['font-bold', text.muted],
	density,
	outline,
	defaults: { density: 'md', outline: false },
})

/**
 * Table-side projections onto descendant cells. Cells and headers are
 * static leaves carrying their own md padding. The table overrides the
 * density-, outline-, stripe-, and hover-varying properties from the
 * `<table>` element. No descendant therefore reads context, and the whole
 * family renders in React Server Components. The exact-depth child chains
 * (`>*>tr>` walks thead/tbody/tfoot) keep a nested table's cells independent.
 * The projection outranks a cell's own classes at every step, the md default
 * included, so a consumer padding `className` on a cell takes `!`.
 *
 * The `hover` scopes to `tbody` rows only, because the head holds no data. It
 * washes at the 5% `hannou.tint` value, an interactive variant that
 * out-cascades the non-interactive 2.5% `striped` wash on the hovered row.
 *
 * Tailwind scans whole class literals. These rows can't be interpolated
 * from the unprefixed values they mirror (the cell `density`, `sen.border.subtle`),
 * or from each other (the `odd`/`even` `striped` parity below). Keep them in
 * step by hand.
 */
const projection = {
	/**
	 * Cell padding for each step. An omitted `size` follows the nearest density
	 * scope, and `md` outside one.
	 */
	density: defineRecipe({
		size: {
			sm: ['[&>*>tr>td]:px-1', '[&>*>tr>td]:py-1', '[&>*>tr>th]:px-1', '[&>*>tr>th]:py-1'],
			md: ['[&>*>tr>td]:px-2', '[&>*>tr>td]:py-2', '[&>*>tr>th]:px-2', '[&>*>tr>th]:py-2'],
			lg: ['[&>*>tr>td]:px-3', '[&>*>tr>td]:py-3', '[&>*>tr>th]:px-3', '[&>*>tr>th]:py-3'],
		},
		defaults: { size: 'md' },
		densityAxis: 'size',
	}),
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
	base: 'w-full text-start text-base',
	// Color only. A `border.subtleColor` sat here with no border *width*, so it
	// painted nothing: the shipped header carries no rule. Restoring one is a
	// visual change, not a cleanup — it needs a width and a design call.
	head: [text.muted],
	header,
	row: [],
	cell,
	projection,
	empty: ['text-center', text.muted],
}
