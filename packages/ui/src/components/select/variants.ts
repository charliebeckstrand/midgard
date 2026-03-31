import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ma, omote } from '../../recipes'

export const selectVariants = cva([
	...omote.input,
	ma.control,
	katachi.maru,
	'appearance-none',
	// Caret icon space
	'pr-[calc(--spacing(10))]',
])

export type SelectVariants = VariantProps<typeof selectVariants>
