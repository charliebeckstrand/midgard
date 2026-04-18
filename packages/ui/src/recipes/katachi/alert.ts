import { tv, type VariantProps } from 'tailwind-variants'
import { colorMatrix } from '../../core/recipe'
import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'

export const alert = tv({
	base: ['flex w-fit', 'gap-3 p-3', 'text-sm/5', maru.rounded],
	variants: {
		variant: {
			solid: ['border border-transparent', kage.shadow],
			soft: ['border border-transparent'],
			outline: ['border'],
			plain: ['border border-transparent'],
		},
		color: { zinc: '', red: '', amber: '', green: '', blue: '' },
	},
	compoundVariants: [
		...colorMatrix('solid', nuri.solid),
		...colorMatrix('soft', nuri.soft),
		...colorMatrix('outline', nuri.outline),
		...colorMatrix('plain', nuri.text),
	],
	defaultVariants: { variant: 'soft', color: 'zinc' },
})

/** Slot classes for sub-elements. */
export const slots = {
	icon: 'shrink-0',
	content: 'flex flex-col flex-1 gap-1 min-w-0',
	title: 'text-base/6 font-semibold',
	description: 'leading-loose',
	actions: 'mt-2 flex items-center gap-1',
	close: ['shrink-0', '-m-1 p-1', maru.roundedMd, sawari.cursor],
}

export type AlertVariants = VariantProps<typeof alert>
