import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.navbar

export const navbarVariants = cva(k.base, {
	variants: {
		variant: k.variant,
	},
	defaultVariants: k.defaults,
})

export type NavbarVariants = VariantProps<typeof navbarVariants>
