import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.input

export const inputVariants = cva(k.base, {
	variants: {
		variant: k.variant,
	},
	defaultVariants: k.defaults,
})

export const inputDateVariants = cva(k.date)

export type InputVariants = VariantProps<typeof inputVariants>
