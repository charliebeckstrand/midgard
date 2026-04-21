import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../../core/recipe'
import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { take } from '../take'

const { color, compoundVariants } = iro({
	solid: nuri.solid,
	soft: nuri.soft,
	outline: nuri.outline,
	plain: nuri.text,
})

export const alert = tv({
	base: ['flex w-fit', 'px-4 py-3.5', take.gap.md, take.text.md, maru.rounded],
	variants: {
		variant: {
			solid: ['border border-transparent', kage.shadow],
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
	title: [take.text.md, 'font-semibold'],
	description: 'leading-loose',
	actions: ['mt-2 flex items-center', take.gap.sm],
	close: ['shrink-0', '-m-1 p-1', maru.roundedMd, sawari.cursor],
}

export type AlertVariants = VariantProps<typeof alert>
