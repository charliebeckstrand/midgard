import { cva, type VariantProps } from 'class-variance-authority'
import { sumi } from '../../recipes'

export const textVariants = cva('', {
	variants: {
		variant: {
			default: sumi.base,
			muted: sumi.usui,
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

export type TextVariants = VariantProps<typeof textVariants>
