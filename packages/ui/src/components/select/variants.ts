import { cva, type VariantProps } from 'class-variance-authority'
import { omote } from '../../recipes'

export const selectVariants = cva([
	...omote.formInput,
	'appearance-none',
	// Caret icon space
	'pr-[calc(--spacing(10))]',
])

export type SelectVariants = VariantProps<typeof selectVariants>
