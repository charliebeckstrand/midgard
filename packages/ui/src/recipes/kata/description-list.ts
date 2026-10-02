import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, narabi } from '../kiso'

const { text } = iro
const { weight } = ji
const { flex } = narabi

/**
 * The text takes the step of the nearest density scope. At `md` it is
 * `text-sm`, and each outer step is one size of the text scale away.
 */
const root = defineRecipe({
	base: 'density-text-[xs,sm,base]',
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
 * Tailwind scans whole class literals; these rows can't be interpolated
 * from the unprefixed values they mirror (the old per-leaf orientation
 * classes). Keep them in step by hand.
 *
 * The block padding of each cell takes the step of the nearest density scope.
 * At `md` a horizontal cell has `py-2` from the `sm` breakpoint, and a
 * vertical term has `pt-4` above it. Each stepped class writes one side, so
 * the narrow and the wide rows set no property twice. The `pr-2` gutter of a
 * term keeps one size, because no stepped utility writes `padding-right`.
 */
const projection = {
	horizontal: [
		'[&>dt]:col-start-1',
		'[&>dt]:density-pt-[1.5,2,2.5]',
		'[&>dt]:pr-2',
		'sm:[&>dt]:density-pb-[1.5,2,2.5]',
		'[&>dd]:density-pb-[1.5,2,2.5]',
		'sm:[&>dd]:density-pt-[1.5,2,2.5]',
		// The first row has no row above it, so it drops its top padding, as the
		// vertical list does. The selectors outrank the rows above at each width.
		'[&>dt:first-child]:pt-0',
		'[&>dt:first-child+dd]:pt-0',
	],
	vertical: [
		'[&>dt]:density-pt-[3,4,5]',
		'[&>dt:first-child]:pt-0',
		'[&>dd]:density-pt-[0.5,1,1.5]',
	],
} as const

export const k = {
	root,
	projection,
	term: [text.muted, weight.medium],
	details: text.default,
	skeleton: kokkaku.descriptionList,
} as const
