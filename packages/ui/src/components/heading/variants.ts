import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.heading

export const headingVariants = cva(k.base, {
	variants: { level: k.level },
	defaultVariants: k.defaults,
})

export type HeadingVariants = VariantProps<typeof headingVariants>
