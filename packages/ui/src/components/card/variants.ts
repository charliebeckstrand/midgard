import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.card

export const cardVariants = cva(k.base, {
	variants: {
		variant: k.variant,
	},
	defaultVariants: k.defaults,
})

export type CardVariants = VariantProps<typeof cardVariants>
