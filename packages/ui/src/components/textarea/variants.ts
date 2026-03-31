import { cva, type VariantProps } from 'class-variance-authority'
import { omote } from '../../recipes'

export const textareaVariants = cva(omote.formInput, {
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
