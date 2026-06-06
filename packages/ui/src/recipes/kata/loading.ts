import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { narabi } from '../kiso'

const { flex } = narabi

/**
 * A single ellipsis dot. Diameter rides the shared `size` axis; the breathing
 * pulse is `motion-safe:`-gated so it rests as a steady dot under
 * `prefers-reduced-motion` (WCAG 2.3.3) rather than freezing mid-fade. Colour
 * comes from the container's `text-*` via `bg-current`.
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
		color: {
			current: 'text-current',
			zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
			red: mode('text-red-600', 'dark:text-red-500'),
			amber: 'text-amber-500',
			green: mode('text-green-600', 'dark:text-green-500'),
			blue: mode('text-blue-600', 'dark:text-blue-500'),
		},
		defaults: { size: 'md', color: 'current' },
	},
	{ dot },
)

export type LoadingDotsVariants = VariantProps<typeof k>
