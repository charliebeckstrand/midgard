import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { iro } from '../kiso'

const { marker } = iro

export const k = defineRecipe({
	base: 'inline-block shrink-0 animate-spin',
	size: {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
		xl: 'size-8',
	},
	// Chromatic colours read the shared `iro.marker` shade (600 light / 500
	// dark) so the spinner glyph clears non-text 3:1 on the page; `current`
	// inherits the surrounding text colour and `zinc` keeps its stronger
	// neutral.
	color: {
		current: 'text-current',
		zinc: mode('text-zinc-600', 'dark:text-zinc-400'),
		red: marker.red,
		amber: marker.amber,
		green: marker.green,
		blue: marker.blue,
	},
	defaults: { size: 'md', color: 'current' },
})

export type SpinnerVariants = VariantProps<typeof k>
