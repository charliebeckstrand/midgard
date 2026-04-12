import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.text

export const textVariants = cva('', {
	variants: { variant: k.variant, color: k.color },
	defaultVariants: k.defaults,
})

export type TextVariants = VariantProps<typeof textVariants>
