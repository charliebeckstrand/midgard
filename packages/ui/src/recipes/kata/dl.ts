import { defineRecipe } from '../../core/recipe'
import { iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

const root = defineRecipe({
	base: size.sm,
	orientation: {
		horizontal: 'grid grid-cols-1 sm:grid-cols-[min(50%,--spacing(56))_auto]',
		vertical: flex.col,
	},
	defaults: { orientation: 'horizontal' },
})

/**
 * List-side projections onto direct `dt` / `dd` children. Term and details
 * are static leaves carrying only their text styling; the list owns every
 * orientation-varying property, so neither child reads context and both
 * render in React Server Components. Direct-child selectors keep a nested
 * `<DescriptionList>` inside a `dd` independent.
 *
 * Tailwind scans whole class literals; these rows can't be interpolated
 * from the unprefixed values they mirror (`sen.border.subtleColor`, the old
 * per-leaf orientation classes). Keep them in step by hand.
 */
const projection = {
	horizontal: [
		'[&>dt]:col-start-1',
		'[&>dt]:pt-2',
		'[&>dt]:pr-2',
		'sm:[&>dt]:py-2',
		'[&>dd]:pb-2',
		'sm:[&>dd]:py-2',
	],
	vertical: ['[&>dt]:pt-4', '[&>dt:first-child]:pt-0', '[&>dd]:pt-1'],
} as const

export const k = {
	root,
	projection,
	term: [text.muted, weight.medium],
	details: text.default,
} as const
