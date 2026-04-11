import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.slider

export const sliderVariants = cva(k.base, {
	variants: {
		size: k.size,
		color: k.color,
	},
	defaultVariants: k.defaults,
})

export type SliderVariants = VariantProps<typeof sliderVariants>
