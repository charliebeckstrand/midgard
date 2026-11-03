import { defineKata, type VariantProps } from '../../core/recipe'
import { iro, kasane, sen } from '../kiso'

const { palette } = iro
const { rounded } = kasane
const { focus } = sen

export const k = defineKata({
	// The ring of the library on keyboard focus, in place of the outline of the
	// browser. The radius rounds the ring, as on a Breadcrumb link.
	base: [rounded.sm, focus.ring],
	color: {
		zinc: palette.bare.zinc,
		red: palette.bare.red,
		amber: palette.bare.amber,
		green: palette.bare.green,
		blue: palette.bare.blue,
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
