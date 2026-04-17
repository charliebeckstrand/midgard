import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const badge = {
	base: ['group inline-flex w-fit items-center font-medium'],
	variant: {
		solid: {
			base: [maru.roundedMd, 'border border-transparent'],
			color: nuri.solid,
		},
		soft: {
			base: [maru.roundedMd, 'border border-transparent'],
			color: nuri.soft,
		},
		outline: {
			base: [maru.roundedMd, 'border'],
			color: nuri.outline,
		},
		plain: {
			base: [maru.roundedMd, 'border border-transparent'],
			color: nuri.text,
		},
	},
	size: take.badge,
	defaults: { variant: 'soft' as const, color: 'zinc' as const, size: 'md' as const },
}
