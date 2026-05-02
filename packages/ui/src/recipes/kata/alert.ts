import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../ryu/iro'
import { ji } from '../ryu/ji'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
	solid: merge(solid.bg, solid.text),
	soft: merge(soft.bg, soft.text),
	outline: merge(outline.ring, outline.text),
	plain: plain.text,
})

export const alert = tv({
	base: ['flex w-fit', 'px-4 py-3.5', 'gap-sm', ji.size.md, 'rounded-lg'],
	variants: {
		variant: {
			solid: '',
			soft: '',
			outline: 'ring-1 ring-inset',
			plain: '',
		},
		color,
	},
	compoundVariants,
	defaultVariants: { variant: 'soft', color: 'zinc' },
})

/** Slot classes for sub-elements. */
export const slots = {
	icon: 'shrink-0',
	title: [ji.size.lg, 'font-semibold'],
	description: '',
	content: 'flex flex-col flex-1 min-w-0',
	actions: ['mt-2 flex items-center', 'gap-xs'],
	close: ['shrink-0', 'rounded-md'],
}

export type AlertVariants = VariantProps<typeof alert>
