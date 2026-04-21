import { tv, type VariantProps } from 'tailwind-variants'
import { colorVariants } from '../../core/recipe'
import { ji } from '../ji'
import { kage } from '../kage'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'

const { color, compoundVariants } = colorVariants({
	solid: nuri.solid,
	soft: nuri.soft,
	outline: nuri.outline,
	plain: nuri.text,
})

export const alert = tv({
	base: ['flex w-fit', 'px-4 py-3.5', kumi.gap.md, ji.size.md, maru.rounded],
	variants: {
		variant: {
			solid: ['border border-transparent', kage.sm],
			soft: ['border border-transparent'],
			outline: ['border'],
			plain: ['border border-transparent'],
		},
		color,
	},
	compoundVariants,
	defaultVariants: { variant: 'soft', color: 'zinc' },
})

/** Slot classes for sub-elements. */
export const slots = {
	icon: 'shrink-0',
	content: 'flex flex-col flex-1 min-w-0',
	title: [ji.size.md, 'font-semibold'],
	description: 'leading-loose',
	actions: ['mt-2 flex items-center', kumi.gap.sm],
	close: ['shrink-0', '-m-1 p-1', maru.roundedMd, sawari.cursor],
}

export type AlertVariants = VariantProps<typeof alert>
