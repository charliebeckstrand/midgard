import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.progress

export const progressTrackVariants = cva(k.bar.track, {
	variants: {
		size: k.bar.size,
	},
	defaultVariants: k.bar.defaults,
})

export const progressGaugeVariants = cva(k.gauge.wrapper, {
	variants: {
		size: k.gauge.size,
	},
	defaultVariants: k.gauge.defaults,
})

export type ProgressTrackVariants = VariantProps<typeof progressTrackVariants>
export type ProgressGaugeVariants = VariantProps<typeof progressGaugeVariants>
