import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.divider

export const dividerVariants = cva(k.base, {
	variants: {
		orientation: k.orientation,
		soft: k.soft,
	},
	defaultVariants: k.defaults,
})

export type DividerVariants = VariantProps<typeof dividerVariants>
