import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ma, omote } from '../../recipes'

export const selectControlVariants = cva(omote.control)

export const selectVariants = cva([
	...omote.input,
	ma.control,
	katachi.maru,
	'sm:text-sm/6',
	'appearance-none',
	// Caret icon space
	'pr-[calc(--spacing(10))]',
])

export type SelectVariants = VariantProps<typeof selectVariants>
