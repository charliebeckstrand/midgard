import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

const k = katachi.scrollArea

type Orientation = keyof typeof k.viewport.orientation
type Size = keyof (typeof k.viewport.size)['vertical']

const orientationKeys = Object.keys(k.viewport.orientation) as Orientation[]
const sizeKeys = Object.keys(k.viewport.size.vertical) as Size[]

const sizeCompoundVariants = orientationKeys.flatMap((orientation) =>
	sizeKeys.map((size) => ({
		orientation,
		size,
		class: k.viewport.size[orientation][size],
	})),
)

export const scrollAreaWrapperVariants = cva(k.wrapper.base, {
	variants: {
		rounded: k.rounded,
		bare: k.wrapper.bare,
		orientation: Object.fromEntries(orientationKeys.map((key) => [key, ''])) as Record<
			Orientation,
			string
		>,
		size: Object.fromEntries(sizeKeys.map((key) => [key, ''])) as Record<Size, string>,
	},
	compoundVariants: sizeCompoundVariants,
	defaultVariants: { ...k.defaults, orientation: k.viewport.defaults.orientation },
})

export const scrollAreaViewportVariants = cva(k.viewport.base, {
	variants: {
		orientation: k.viewport.orientation,
		bare: k.viewport.bare,
	},
	defaultVariants: k.viewport.defaults,
})

export const scrollAreaScrollbarVariants = cva(k.scrollbar.base, {
	variants: {
		orientation: k.scrollbar.orientation,
		rounded: k.scrollbar.rounded,
		state: k.scrollbar.state,
	},
	compoundVariants: k.scrollbar.compoundVariants,
	defaultVariants: { rounded: false },
})

export const scrollAreaThumbVariants = cva(k.thumb.base, {
	variants: {
		orientation: k.thumb.orientation,
	},
})

export type ScrollAreaWrapperVariants = VariantProps<typeof scrollAreaWrapperVariants>
export type ScrollAreaViewportVariants = VariantProps<typeof scrollAreaViewportVariants>
