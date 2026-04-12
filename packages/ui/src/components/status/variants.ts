import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.status.dot

export const statusDotVariants = cva(k.base, {
	variants: {
		variant: k.variant,
		status: k.status,
		size: k.size,
		pulse: k.pulse,
	},
	defaultVariants: k.defaults,
})

export type StatusDotVariants = VariantProps<typeof statusDotVariants>
