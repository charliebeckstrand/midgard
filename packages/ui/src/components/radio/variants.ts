import { cva, type VariantProps } from 'class-variance-authority'
import { colorVariants } from '../../core'
import { ki, nuri } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const radioColorVariants = colorVariants(nuri.radio)

/** Input styling — no color (inherited from parent) */
export const radioVariants = cva([
	// Base — fills the parent span
	'absolute inset-0 appearance-none cursor-pointer rounded-full',
	// Unchecked
	'border border-zinc-950/15 bg-white shadow-xs dark:border-white/15 dark:bg-white/5',
	// Focus
	ki.offset,
	// Checked
	'checked:border-transparent checked:bg-(--radio-checked-bg)',
	'checked:border-(--radio-checked-border)',
	// Hover
	'not-disabled:hover:border-zinc-950/30 dark:not-disabled:hover:border-white/30',
	'not-disabled:checked:hover:opacity-90',
	// Disabled
	'disabled:opacity-50 disabled:cursor-not-allowed',
	// Forced colors
	'forced-colors:appearance-auto forced-colors:checked:appearance-auto',
])

export type RadioVariants = VariantProps<typeof radioColorVariants>
