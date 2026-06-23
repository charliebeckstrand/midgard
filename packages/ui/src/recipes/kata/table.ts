/**
 * Table kata: object-literal surface for the bare `<Table>` element and its
 * cells. The `cell` and `header` sub-recipes carry the density/grid leaf
 * styling; `projection` holds the density-, grid-, and stripe-varying child
 * selectors the `<table>` casts onto descendants so cells read no context and
 * the family renders in RSC. `head`, `row`, and `empty` are static slots.
 */
import { defineRecipe } from '../../core/recipe'
import { iro, sen } from '../kiso'

const { text } = iro
const { border } = sen

// Density scales the padding only; cell text size never changes.
const cellDensity = {
	sm: 'px-1 py-1',
	md: 'px-2 py-2',
	lg: 'px-3 py-3',
}

const grid = {
	true: border.subtle,
	false: '',
}

const cell = defineRecipe({
	base: [text.default],
	density: cellDensity,
	grid,
	defaults: { density: 'md', grid: false },
})

const header = defineRecipe({
	base: ['font-bold', text.muted],
	density: cellDensity,
	grid,
	defaults: { density: 'md', grid: false },
})

/**
 * Table-side projections onto descendant cells. Cells and headers are
 * static leaves carrying their own md padding; the table overrides the
 * density-, grid-, and stripe-varying properties from the `<table>`
 * element, so no descendant reads context and the whole family renders in
 * React Server Components. The exact-depth child chains (`>*>tr>` walks
 * thead/tbody/tfoot) keep a nested table's cells independent. md has no
 * density row: at the default step the cell's own classes already match,
 * and a consumer `className` on a cell keeps overriding them.
 *
 * Tailwind scans whole class literals; these rows can't be interpolated
 * from the unprefixed values they mirror (`cellDensity`, `sen.border.subtle`)
 * or from each other (the `odd`/`even` `striped` parity below). Keep them in
 * step by hand.
 */
const projection = {
	density: {
		sm: ['[&>*>tr>td]:px-1', '[&>*>tr>td]:py-1', '[&>*>tr>th]:px-1', '[&>*>tr>th]:py-1'],
		md: [],
		lg: ['[&>*>tr>td]:px-3', '[&>*>tr>td]:py-3', '[&>*>tr>th]:px-3', '[&>*>tr>th]:py-3'],
	},
	grid: [
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
} as const

export const k = {
	base: 'w-full text-left text-base',
	head: [text.muted, border.subtleColor],
	header,
	row: [],
	cell,
	projection,
	empty: ['text-center', text.muted],
}
