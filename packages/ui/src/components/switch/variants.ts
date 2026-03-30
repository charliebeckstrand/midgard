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
		'data-checked:bg-(--switch-bg) data-checked:ring-(--switch-bg-ring) data-checked:ring-inset',
		// Hover
		'hover:bg-zinc-300 dark:hover:bg-white/15',
		'data-checked:hover:opacity-90',
		// Disabled
		'disabled:opacity-50 disabled:cursor-default',
		// Forced colors
		'forced-colors:appearance-auto forced-colors:data-checked:appearance-auto',
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
	'pointer-events-none relative inline-block size-4 rounded-full',
	'translate-x-1 transition-transform duration-200 ease-in-out',
	'bg-white shadow-sm ring-1 ring-zinc-950/5',
	'peer-checked:group-[]:translate-x-5',
	'peer-checked:group-[]:bg-(--switch) peer-checked:group-[]:shadow-(--switch-shadow) peer-checked:group-[]:ring-(--switch-ring)',
])

export type SwitchVariants = VariantProps<typeof switchVariants>
