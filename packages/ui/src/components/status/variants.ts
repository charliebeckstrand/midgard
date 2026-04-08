import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.status.dot

export const statusDotVariants = cva(k.base, {
	variants: {
		status: k.status,
		size: k.size,
	},
	defaultVariants: k.defaults,
})

export type StatusDotVariants = VariantProps<typeof statusDotVariants>
