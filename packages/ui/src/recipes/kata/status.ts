import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro, kasane, omote, ugoki } from '../kiso'

const { marker } = iro
const { rounded } = kasane
const { bg } = omote
const { css } = ugoki

export const k = defineRecipe({
	base: ['inline-block', rounded.full],
	variant: {
		solid: 'bg-current',
		outline: ['border-2 border-current', ...bg.surface],
	},
	// The dot fills with `currentColor` (solid) or shows it as a border (outline).
	// Uses the `iro.marker` shade, which clears non-text 3:1 on the page.
	status: {
		inactive: marker.zinc,
		active: marker.green,
		info: marker.blue,
		warning: marker.amber,
		error: marker.red,
	},
	pulse: {
		true: css.pulse,
		false: '',
	},
	size: {
		xs: 'size-1.5',
		sm: 'size-2',
		md: 'size-2.5',
		lg: 'size-3',
		xl: 'size-4',
	},
	defaults: {
		variant: 'solid',
		status: 'inactive',
		size: 'md',
		pulse: false,
	},
})

export type StatusDotVariants = VariantProps<typeof k>
