import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.timeline

export const timelineVariants = cva(k.base, {
	variants: {
		orientation: k.orientation,
		variant: k.variant,
	},
	defaultVariants: k.defaults,
})

export type TimelineVariants = VariantProps<typeof timelineVariants>
