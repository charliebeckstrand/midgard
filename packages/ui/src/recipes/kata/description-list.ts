import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { flex } = narabi

/**
 * The text takes the step of the nearest density scope. At `md` it is
 * `text-sm`, and each outer step is one size of the text scale away.
 */
const base = defineRecipe({
	base: dan.text.small,
	orientation: {
		horizontal: 'grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		vertical: flex.col,
	},
	defaults: { orientation: 'horizontal' },
})

/**
 * List-side projections onto direct `dt` / `dd` children. Term and details
 * are static leaves carrying only their text styling. The list owns every
 * orientation-varying property, so neither child reads context and both
 * render in React Server Components. Direct-child selectors keep a nested
 * `<DescriptionList>` inside a `dd` independent.
 *
 * Tailwind scans whole class literals. Each row therefore writes its
 * `[&>dt]` or `[&>dd]` selector in full, and no row builds its class from a
 * template.
 *
 * Below the `sm` breakpoint a horizontal list stacks each term above its
 * details. There it takes the padding of a vertical list, so the two
 * orientations look the same on a phone. From `sm` each cell of a row has a
 * block padding, `py-2` at `md`, and a term has the `pe-2` gutter. Each
 * narrow class has `max-sm:` and each wide class has `sm:`, so no property
 * has two values at one width.
 *
 * The block padding of each cell takes the step of the nearest density scope.
 * At `md` a vertical term has `pt-4` above it, and its details have `pt-1`.
 * The `pe-2` gutter of a term keeps one size, because no stepped utility
 * writes `padding-inline-end`.
 */
const projection = {
	horizontal: [
		'[&>dt]:col-start-1',
		dan.space.term.stacked.narrow,
		dan.space.detail.stacked.narrow,
		dan.space.term.row.top,
		dan.space.term.row.bottom,
		'sm:[&>dt]:pe-2',
		dan.space.detail.row.top,
		dan.space.detail.row.bottom,
		// The first row has no row above it, so it drops its top padding, as the
		// vertical list does. The selectors outrank the rows above at each width.
		'[&>dt:first-child]:pt-0',
		'sm:[&>dt:first-child+dd]:pt-0',
	],
	vertical: [dan.space.term.stacked.top, '[&>dt:first-child]:pt-0', dan.space.detail.stacked.top],
} as const

export const k = {
	base,
	projection,
	term: [text.muted, weight.medium],
	details: text.default,
	skeleton: kokkaku.descriptionList,
} as const
