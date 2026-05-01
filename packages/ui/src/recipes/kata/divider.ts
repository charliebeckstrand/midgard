import { tv, type VariantProps } from 'tailwind-variants'
import { sen } from '../ryu/sen'

export const divider = tv({
	base: ['border-0'],
	variants: {
		orientation: {
			horizontal: 'w-full border-t',
			vertical: 'self-stretch border-l',
		},
		soft: {
			true: [...sen.borderSubtleColor],
			false: [...sen.borderColor],
		},
	},
	defaultVariants: { orientation: 'horizontal', soft: false },
})

export type DividerVariants = VariantProps<typeof divider>
