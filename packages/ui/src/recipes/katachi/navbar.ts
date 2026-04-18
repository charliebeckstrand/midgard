import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { maru } from '../maru'

export const navbar = tv({
	base: ['flex items-center gap-4', 'overflow-x-auto', 'px-4 py-2.5', maru.rounded, 'border'],
	variants: {
		variant: {
			outline: [...kage.borderColor],
			plain: [...kage.borderTransparent],
		},
	},
	defaultVariants: { variant: 'outline' },
})

export type NavbarVariants = VariantProps<typeof navbar>
