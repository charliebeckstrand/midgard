import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'

export const divider = tv({
	base: ['border-0'],
	variants: {
		orientation: {
			horizontal: 'w-full border-t',
			vertical: 'self-stretch border-l',
		},
		soft: {
			true: [...kage.borderSubtleColor],
			false: [...kage.borderColor],
		},
	},
	defaultVariants: { orientation: 'horizontal', soft: false },
})

export type DividerVariants = VariantProps<typeof divider>
