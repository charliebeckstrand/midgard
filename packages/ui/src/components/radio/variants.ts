import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { form } from '../../primitives/form'
import { nuri } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const radioColorVariants = colorCva('', nuri.radio)

/** Input styling — no color (inherited from parent) */
export const radioVariants = cva([
	...form.check,
	'rounded-full',
	'checked:border-transparent checked:bg-(--radio-checked-bg)',
	'checked:border-(--radio-checked-border)',
])

export type RadioVariants = VariantProps<typeof radioColorVariants>
