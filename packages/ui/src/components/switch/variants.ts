import { cva, type VariantProps } from 'class-variance-authority'
import { ki, nuri } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const switchColorVariants = cva('', {
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
})

/** Input styling — no color (inherited from parent) */
export const switchVariants = cva([
	// Base — fills the parent span
	'absolute inset-0 appearance-none cursor-pointer rounded-full',
	// Unchecked — track
	'bg-zinc-200 ring-1 ring-zinc-950/5 ring-inset dark:bg-white/10 dark:ring-white/15',
	// Focus
	ki.reset,
	ki.offset,
	// Checked — track
	'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
	// Hover — only on unchecked so it doesn't override the active color
	'not-checked:hover:bg-zinc-300 dark:not-checked:hover:bg-white/15',
	// Disabled
	'disabled:opacity-50 disabled:cursor-default',
	// Forced colors
	'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
])

export const switchThumbVariants = cva([
	'pointer-events-none absolute top-1 left-1 inline-block size-4 rounded-full',
	'bg-white shadow-sm ring-1 ring-zinc-950/5',
	'transition-[left] duration-200 ease-in-out',
])

export type SwitchVariants = VariantProps<typeof switchColorVariants>
