import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro, narabi } from '../kiso'

const { marker } = iro
const { flex } = narabi

/**
 * Indicator colour, shared by both loading surfaces. Resolves to a `text-*`
 * class so the dots (`bg-current`) and the spinner SVG (`currentColor`) both
 * inherit it. Chromatic colours read the shared `iro.marker` shade (600 light
 * / 500 dark) so the indicator clears non-text 3:1 on the page; `current`
 * inherits the surrounding text colour and `zinc` keeps its stronger neutral.
 */
const color = {
	current: 'text-current',
	zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
	red: marker.red,
	amber: marker.amber,
	green: marker.green,
	blue: marker.blue,
}

/**
 * A single ellipsis dot. Diameter rides the shared `size` axis; the breathing
 * pulse is `motion-safe:`-gated so it rests as a steady dot under
 * `prefers-reduced-motion` (WCAG 2.3.3) rather than freezing mid-fade.
 */
const dot = defineRecipe({
	base: ['shrink-0 rounded-full bg-current', 'motion-safe:animate-pulse'],
	size: {
		xs: 'size-1',
		sm: 'size-1.5',
		md: 'size-2',
		lg: 'size-2.5',
		xl: 'size-3',
	},
	defaults: { size: 'md' },
})

/** Rotating SVG indicator — the classic indeterminate spinner. */
const spinner = defineRecipe({
	base: 'inline-block shrink-0 animate-spin',
	size: {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
		xl: 'size-8',
	},
	color,
	defaults: { size: 'md', color: 'current' },
})

export const k = defineRecipe(
	{
		base: [flex.inline, 'shrink-0'],
		size: {
			xs: 'gap-0.5',
			sm: 'gap-1',
			md: 'gap-1.5',
			lg: 'gap-2',
			xl: 'gap-2.5',
		},
		color,
		defaults: { size: 'md', color: 'current' },
	},
	{ dot, spinner },
)

export type LoadingDotsVariants = VariantProps<typeof k>
export type LoadingSpinnerVariants = VariantProps<typeof spinner>
