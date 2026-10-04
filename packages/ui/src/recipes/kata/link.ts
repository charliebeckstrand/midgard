import { defineRecipe, type VariantProps } from '../../core/recipe'
import { iro } from '../kiso'

const { palette } = iro

export const k = defineRecipe({
	color: {
		...palette.bare.text,
		current: 'text-current dark:text-current',
	},
	// An underline at rest: with the default `current` color, it is the only
	// mark of the link (WCAG 1.4.1).
	underline: {
		true: 'underline underline-offset-4',
		false: '',
	},
	defaults: { color: 'current', underline: false },
})

export type LinkVariants = Omit<VariantProps<typeof k>, 'color' | 'underline'> & {
	/** The text color of the link. `current` takes the color of the text around it. @defaultValue 'current' */
	color?: VariantProps<typeof k>['color']
	/** Whether the link shows an underline at rest. @defaultValue false */
	underline?: VariantProps<typeof k>['underline']
}
