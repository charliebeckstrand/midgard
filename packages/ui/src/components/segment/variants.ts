import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.segment

const rootSize = Object.fromEntries(
	Object.entries(k.size).map(([key, { base }]) => [key, base]),
) as Record<keyof typeof k.size, string>

const segmentSize = Object.fromEntries(
	Object.entries(k.size).map(([key, { segment }]) => [key, segment]),
) as Record<keyof typeof k.size, string>

export const segmentControlVariants = cva(k.base, {
	variants: { size: rootSize },
	defaultVariants: k.defaults,
})

export const segmentItemVariants = cva(k.segment, {
	variants: { size: segmentSize },
	defaultVariants: k.defaults,
})

export type SegmentControlVariants = VariantProps<typeof segmentControlVariants>
export type SegmentItemVariants = VariantProps<typeof segmentItemVariants>
