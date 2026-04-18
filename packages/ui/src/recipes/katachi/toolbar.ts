import { tv, type VariantProps } from 'tailwind-variants'
import { kage } from '../kage'
import { maru } from '../maru'
import { omote } from '../omote'

export const toolbar = tv({
	base: 'flex items-center',
	variants: {
		orientation: {
			horizontal: 'flex-row flex-wrap gap-1',
			vertical: 'flex-col w-fit gap-1',
		},
		variant: {
			plain: '',
			outline: [...kage.border, maru.rounded, 'p-1'],
			solid: [...omote.tint, 'border border-transparent', maru.rounded, 'p-1'],
		},
	},
	defaultVariants: { orientation: 'horizontal', variant: 'plain' },
})

export const toolbarGroup = tv({
	base: 'flex items-center',
	variants: {
		orientation: {
			horizontal: 'flex-row gap-0.5',
			vertical: 'flex-col gap-0.5',
		},
	},
	defaultVariants: { orientation: 'horizontal' },
})

export type ToolbarVariants = VariantProps<typeof toolbar>
export type ToolbarGroupVariants = VariantProps<typeof toolbarGroup>
