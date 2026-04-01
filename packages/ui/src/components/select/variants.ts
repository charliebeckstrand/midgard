import { cva, type VariantProps } from 'class-variance-authority'
import { form } from '../../primitives/form'

export const selectVariants = cva([
	...form.formInput,
	'appearance-none',
	// Caret icon space
	'pr-[calc(--spacing(10))]',
])

export type SelectVariants = VariantProps<typeof selectVariants>
