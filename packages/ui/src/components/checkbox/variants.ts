import { cva, type VariantProps } from 'class-variance-authority'
import { ki, nuri } from '../../recipes'

export const checkboxVariants = cva(
	[
		// Base
		'inline-flex size-[1.125rem] shrink-0 cursor-pointer items-center justify-center sm:size-4',
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
	],
	{
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
	},
)

export type CheckboxVariants = VariantProps<typeof checkboxVariants>
