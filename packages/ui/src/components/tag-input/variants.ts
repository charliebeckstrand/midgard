import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.tagInput

export const tagInputContainerVariants = cva(k.container, {
	variants: {
		size: k.containerSize,
	},
	defaultVariants: k.defaults,
})

export const tagInputVariants = cva(k.base, {
	variants: {
		size: k.size,
	},
	defaultVariants: k.defaults,
})

export type TagInputVariants = VariantProps<typeof tagInputContainerVariants>
