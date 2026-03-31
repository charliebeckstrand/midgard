import { cva, type VariantProps } from 'class-variance-authority'
import { ki, nuri } from '../../recipes'

export const radioVariants = cva(
	[
		// Base — fills the parent span
		'absolute inset-0 appearance-none cursor-pointer rounded-full',
		// Unchecked
		'border border-zinc-950/15 bg-white shadow-xs dark:border-white/15 dark:bg-white/5',
		// Focus
		ki.reset,
		ki.offset,
		// Checked
		'checked:border-transparent checked:bg-(--radio-checked-bg)',
		'checked:border-(--radio-checked-border)',
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
				zinc: nuri.radio.zinc,
				white: nuri.radio.white,
				dark: nuri.radio.dark,
				red: nuri.radio.red,
				amber: nuri.radio.amber,
				green: nuri.radio.green,
				blue: nuri.radio.blue,
			},
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)

export type RadioVariants = VariantProps<typeof radioVariants>
