import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.stat

export const statValueVariants = cva(k.value.base, {
	variants: {
		size: k.value.size,
	},
	defaultVariants: k.value.defaults,
})

export const statDeltaVariants = cva(k.delta.base, {
	variants: {
		trend: k.delta.trend,
	},
	defaultVariants: k.delta.defaults,
})

export type StatValueVariants = VariantProps<typeof statValueVariants>
export type StatDeltaVariants = VariantProps<typeof statDeltaVariants>
