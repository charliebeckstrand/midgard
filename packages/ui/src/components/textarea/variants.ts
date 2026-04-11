import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.textarea

export const textareaVariants = cva(k.base, {
	variants: {
		resize: k.resize,
		autoResize: { true: k.autoResize, false: '' },
	},
	defaultVariants: { ...k.defaults, autoResize: false },
})

export type TextareaVariants = VariantProps<typeof textareaVariants>
