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
	base: ['flex w-fit items-center', 'p-4', 'gap-sm', ji.size.md, 'rounded-lg'],
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
	icon: 'shrink-0 self-center',
	title: [ji.size.lg, 'leading-tight font-semibold'],
	description: ['leading-tight', 'col-start-2'],
	content: ['flex-1 min-w-0', 'gap-md'],
	body: 'col-start-2',
	actions: ['flex items-center', 'gap-xs'],
	close: ['shrink-0'],
}

export type AlertVariants = VariantProps<typeof alert>

export { alert as alertVariants, slots as k }
