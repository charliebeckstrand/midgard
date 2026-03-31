import { cva, type VariantProps } from 'class-variance-authority'
import { katachi, ma, omote } from '../../recipes'

export const textareaVariants = cva([...omote.input, ma.control, katachi.maru], {
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
