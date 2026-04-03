import { cva, type VariantProps } from 'class-variance-authority'
import { form } from '../../primitives/form'

export const selectVariants = cva([
	...form.input,
	'appearance-none',
	// Caret icon space
	'pr-[calc(--spacing(10))]',
	// Windows browsers render native <option> elements using system color-scheme
	'dark:[color-scheme:dark]',
])

export type SelectVariants = VariantProps<typeof selectVariants>
