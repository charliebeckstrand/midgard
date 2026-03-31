import { cva, type VariantProps } from 'class-variance-authority'
import { kage } from '../../recipes'

export const dividerVariants = cva('border-0', {
	variants: {
		orientation: {
			horizontal: 'w-full border-t',
			vertical: 'self-stretch border-l',
		},
		soft: {
			true: kage.usui,
			false: kage.base,
		},
	},
	defaultVariants: {
		orientation: 'horizontal',
		soft: false,
	},
})

export type DividerVariants = VariantProps<typeof dividerVariants>
