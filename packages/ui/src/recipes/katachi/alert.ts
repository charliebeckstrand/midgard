import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { iro, merge } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'

const { solid, soft, outline, plain } = iro.palette

const { color, compoundVariants } = colorVariants({
	solid: merge(solid.bg, solid.text),
	soft: merge(soft.bg, soft.text),
	outline: merge(outline.ring, outline.text),
	plain: plain.text,
})

export const alert = tv({
	base: ['flex w-fit', 'px-4 py-3.5', kumi.gap.md, ji.size.md, maru.rounded.lg],
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
	actions: ['mt-2 flex items-center', kumi.gap.sm],
	close: ['shrink-0', maru.rounded.md],
}

export type AlertVariants = VariantProps<typeof alert>
