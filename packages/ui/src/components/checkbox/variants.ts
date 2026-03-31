import { cva, type VariantProps } from 'class-variance-authority'
import { ki, nuri } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const checkboxColorVariants = cva('', {
	variants: {
		color: {
			zinc: nuri.checkbox.zinc,
			white: nuri.checkbox.white,
			dark: nuri.checkbox.dark,
			red: nuri.checkbox.red,
			amber: nuri.checkbox.amber,
			green: nuri.checkbox.green,
			blue: nuri.checkbox.blue,
		},
	},
	defaultVariants: {
		color: 'zinc',
	},
})

/** Input styling — no color (inherited from parent) */
export const checkboxVariants = cva([
	// Base — fills the parent span
	'absolute inset-0 appearance-none cursor-pointer',
	// Rounded
	'rounded-[--spacing(1)]',
	// Unchecked
	'border border-zinc-950/15 bg-white shadow-xs dark:border-white/15 dark:bg-white/5',
	// Focus
	ki.reset,
	ki.offset,
	// Checked
	'checked:border-transparent checked:bg-(--checkbox-checked-bg)',
	'checked:border-(--checkbox-checked-border)',
	// Hover
	'hover:border-zinc-950/30 dark:hover:border-white/30',
	'checked:hover:opacity-90',
	// Disabled
	'disabled:opacity-50 disabled:cursor-default',
	// Forced colors
	'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
])

export type CheckboxVariants = VariantProps<typeof checkboxColorVariants>
