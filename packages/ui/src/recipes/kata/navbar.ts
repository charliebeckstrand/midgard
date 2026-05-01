import { tv, type VariantProps } from 'tailwind-variants'
import { maru } from '../ryu/maru'
import { sen } from '../ryu/sen'

export const navbar = tv({
	base: ['flex items-center gap-4', 'overflow-x-auto', 'px-4 py-2.5', maru.rounded.lg, 'border'],
	variants: {
		variant: {
			outline: [...sen.borderColor],
			plain: [...sen.borderTransparent],
		},
	},
	defaultVariants: { variant: 'outline' },
})

export type NavbarVariants = VariantProps<typeof navbar>
