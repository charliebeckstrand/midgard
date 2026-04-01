import { cva, type VariantProps } from 'class-variance-authority'
import { colorCva } from '../../core'
import { nuri, omote } from '../../recipes'

/** Color custom properties — applied to the parent span so siblings can inherit */
export const checkboxColorVariants = colorCva('', nuri.checkbox)

/** Input styling — no color (inherited from parent) */
export const checkboxVariants = cva([
	...omote.check,
	'rounded-[--spacing(1)]',
	'checked:border-transparent checked:bg-(--checkbox-checked-bg)',
	'checked:border-(--checkbox-checked-border)',
])

export type CheckboxVariants = VariantProps<typeof checkboxColorVariants>
