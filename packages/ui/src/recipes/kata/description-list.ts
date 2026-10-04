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
 * The block padding of each cell takes the step of the nearest density scope.
 * At `md` a horizontal cell has `py-2` from the `sm` breakpoint, and a
 * vertical term has `pt-4` above it. Each stepped class writes one side, so
 * the narrow and the wide rows set no property twice. The `pr-2` gutter of a
 * term keeps one size, because no stepped utility writes `padding-right`.
 */
const projection = {
	horizontal: [
		'[&>dt]:col-start-1',
		dan.space.termTop,
		'[&>dt]:pr-2',
		dan.space.termBottomRow,
		dan.space.detailBottom,
		dan.space.detailTopRow,
		// The first row has no row above it, so it drops its top padding, as the
		// vertical list does. The selectors outrank the rows above at each width.
		'[&>dt:first-child]:pt-0',
		'[&>dt:first-child+dd]:pt-0',
	],
	vertical: [dan.space.termTopStacked, '[&>dt:first-child]:pt-0', dan.space.detailTopStacked],
} as const

export const k = {
	base,
	projection,
	term: [text.muted, weight.medium],
	details: text.default,
	skeleton: kokkaku.descriptionList,
} as const
