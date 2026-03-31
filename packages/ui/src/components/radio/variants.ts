import { cva, type VariantProps } from 'class-variance-authority'
import { colorVariants } from '../../core'
import { nuri, omote } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const radioColorVariants = colorVariants(nuri.radio)

/** Input styling — no color (inherited from parent) */
export const radioVariants = cva([
	...omote.check,
	'rounded-full',
	'checked:border-transparent checked:bg-(--radio-checked-bg)',
	'checked:border-(--radio-checked-border)',
])

export type RadioVariants = VariantProps<typeof radioColorVariants>
