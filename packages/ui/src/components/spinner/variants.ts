import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.spinner

export const spinnerVariants = cva(k.base, {
	variants: {
		size: k.size,
		color: k.color,
	},
	defaultVariants: k.defaults,
})

export type SpinnerVariants = VariantProps<typeof spinnerVariants>
