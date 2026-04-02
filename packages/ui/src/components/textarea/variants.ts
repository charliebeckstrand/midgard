import { cva, type VariantProps } from 'class-variance-authority'
import { form } from '../../primitives/form'

export const textareaVariants = cva([form.input, 'min-h-10'], {
	variants: {
		resize: {
			none: 'resize-none',
			vertical: 'resize-y',
			horizontal: 'resize-x',
		},
	},
	defaultVariants: {
		resize: 'none',
	},
})

export type TextareaVariants = VariantProps<typeof textareaVariants>
