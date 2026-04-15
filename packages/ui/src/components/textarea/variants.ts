import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.textarea

export const textareaVariants = cva(k.base, {
	variants: {
		variant: k.variant,
		resize: k.resize,
		autoResize: { true: k.autoResize, false: '' },
	},
	defaultVariants: k.defaults,
})

export const controlVariants = cva([], {
	variants: {
		variant: k.control,
	},
	defaultVariants: { variant: 'default' },
})

export type TextareaVariants = VariantProps<typeof textareaVariants>
