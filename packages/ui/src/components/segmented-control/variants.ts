import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.segmentedControl

const rootSize = Object.fromEntries(
	Object.entries(k.size).map(([key, { root }]) => [key, root]),
) as Record<keyof typeof k.size, string>

const segmentSize = Object.fromEntries(
	Object.entries(k.size).map(([key, { segment }]) => [key, segment]),
) as Record<keyof typeof k.size, string>

export const segmentedControlVariants = cva(k.root, {
	variants: { size: rootSize },
	defaultVariants: k.defaults,
})

export const segmentVariants = cva(k.segment, {
	variants: { size: segmentSize },
	defaultVariants: k.defaults,
})

export type SegmentedControlVariants = VariantProps<typeof segmentedControlVariants>
