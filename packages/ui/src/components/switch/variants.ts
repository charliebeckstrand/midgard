import { cva, type VariantProps } from 'class-variance-authority'
import { colorVariants } from '../../core'
import { ki, nuri } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const switchColorVariants = colorVariants(nuri.switch)

/** Input styling — no color (inherited from parent) */
export const switchVariants = cva([
	// Base — fills the parent span
	'absolute inset-0 appearance-none cursor-pointer rounded-full',
	// Unchecked — track
	'bg-zinc-200 ring-1 ring-zinc-950/5 ring-inset dark:bg-white/10 dark:ring-white/15',
	// Focus
	ki.offset,
	// Checked — track
	'checked:bg-(--switch-bg) checked:ring-(--switch-bg-ring) checked:ring-inset',
	// Hover — only on unchecked and not disabled
	'not-disabled:not-checked:hover:bg-zinc-300 dark:not-disabled:not-checked:hover:bg-white/15',
	// Disabled
	'disabled:opacity-50 disabled:cursor-not-allowed',
	// Forced colors
	'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
])

export const switchThumbVariants = cva([
	'pointer-events-none absolute top-1 left-1 inline-block size-4 rounded-full',
	'bg-white shadow-sm ring-1 ring-zinc-950/5',
	'transition-[left] duration-200 ease-in-out',
])

export type SwitchVariants = VariantProps<typeof switchColorVariants>
