import { cva, type VariantProps } from 'class-variance-authority'
import { ki, nuri } from '../../recipes'

export const switchVariants = cva(
	[
		// Base
		'group relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full',
		// Unchecked — track
		'bg-zinc-200 ring-1 ring-zinc-950/5 ring-inset dark:bg-white/10 dark:ring-white/15',
		// Focus
		ki.reset,
		ki.offset,
		// Checked — track
		'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
		// Hover
		'hover:bg-zinc-300 dark:hover:bg-white/15',
		'checked:hover:opacity-90',
		// Disabled
		'disabled:opacity-50 disabled:cursor-default',
		// Forced colors
		'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
	],
	{
		variants: {
			color: {
				zinc: nuri.switch.zinc,
				white: nuri.switch.white,
				dark: nuri.switch.dark,
				red: nuri.switch.red,
				amber: nuri.switch.amber,
				green: nuri.switch.green,
				blue: nuri.switch.blue,
			},
		},
		defaultVariants: {
			color: 'zinc',
		},
	},
)

export const switchThumbVariants = cva([
	'pointer-events-none absolute inline-block size-4 rounded-full',
	'left-1 transition-[left] duration-200 ease-in-out',
	'bg-white shadow-sm ring-1 ring-zinc-950/5',
	'[:checked+&]:left-5',
	'[:checked+&]:bg-(--switch) [:checked+&]:shadow-(--switch-shadow) [:checked+&]:ring-(--switch-ring)',
])

export type SwitchVariants = VariantProps<typeof switchVariants>
