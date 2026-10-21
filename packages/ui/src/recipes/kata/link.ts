import { defineRecipe, type VariantProps } from '../../core/recipe'

export const k = defineRecipe({
	color: {
		zinc: 'text-zinc-500 dark:text-zinc-400',
		red: 'text-red-600 dark:text-red-500',
		amber: 'text-amber-700 dark:text-amber-500',
		green: 'text-green-700 dark:text-green-500',
		blue: 'text-blue-600 dark:text-blue-500',
		// One class for both modes. A `dark:` half would outlive the merge with a host
		// whose own text color has no `dark:` form, such as a solid Button or Badge that
		// renders through Link, and would win over that color in dark mode.
		current: 'text-current',
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
	/** Shows an underline at rest. @defaultValue false */
	underline?: VariantProps<typeof k>['underline']
}
