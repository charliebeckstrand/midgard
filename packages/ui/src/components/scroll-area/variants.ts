import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.scrollArea

export const scrollAreaVariants = cva(k.base, {
	variants: {
		orientation: k.orientation,
	},
	defaultVariants: k.defaults,
})

export type ScrollAreaVariants = VariantProps<typeof scrollAreaVariants>
