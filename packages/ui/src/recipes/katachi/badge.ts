import { maru } from '../maru'
import { nuri } from '../nuri'
import { take } from '../take'

export const badge = {
	base: 'group inline-flex items-center font-medium',
	variant: {
		solid: {
			base: ['border border-transparent', maru.roundedMd],
			color: nuri.solid,
		},
		soft: {
			base: ['border border-transparent', maru.roundedMd],
			color: nuri.soft,
		},
		outline: {
			base: ['border', maru.roundedMd],
			color: nuri.outline,
		},
		plain: {
			base: ['border border-transparent', maru.roundedMd],
			color: nuri.text,
		},
	},
	size: take.badge,
	defaults: { variant: 'soft' as const, color: 'zinc' as const, size: 'md' as const },
}
