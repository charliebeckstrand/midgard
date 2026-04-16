import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'
import { take } from '../take'

export const chip = {
	base: [
		'group inline-flex w-fit items-center font-medium select-none',
		maru.roundedFull,
		sawari.cursor,
		ki.ring,
	],
	variant: {
		solid: {
			base: 'border border-transparent',
			color: nuri.solid,
			active: nuri.solid,
		},
		soft: {
			base: 'border border-transparent',
			color: nuri.soft,
			active: nuri.solid,
		},
		outline: {
			base: 'border',
			color: nuri.outline,
			active: nuri.chipOutlineActive,
		},
		plain: {
			base: 'border border-transparent',
			color: nuri.text,
			active: nuri.soft,
		},
	},
	size: take.chip,
	defaults: {
		variant: 'outline' as const,
		color: 'zinc' as const,
		size: 'md' as const,
		active: false as const,
	},
}
