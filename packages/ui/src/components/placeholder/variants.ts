import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.placeholder

export const placeholderVariants = cva(k.base, {
	variants: { variant: k.variant },
	defaultVariants: k.defaults,
})

export type PlaceholderVariants = VariantProps<typeof placeholderVariants>
