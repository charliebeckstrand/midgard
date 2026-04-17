import { cva, type VariantProps } from 'class-variance-authority'
import { katachi } from '../../recipes'

export const k = katachi.toolbar

export const toolbarVariants = cva(k.base, {
	variants: {
		orientation: k.orientation,
		variant: k.variant,
	},
	defaultVariants: k.defaults,
})

export const toolbarGroupVariants = cva(k.group.base, {
	variants: {
		orientation: k.group.orientation,
	},
	defaultVariants: { orientation: k.defaults.orientation },
})

export type ToolbarVariants = VariantProps<typeof toolbarVariants>
export type ToolbarGroupVariants = VariantProps<typeof toolbarGroupVariants>
