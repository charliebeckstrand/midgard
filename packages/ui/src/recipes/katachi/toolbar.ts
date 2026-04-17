import { kage } from '../kage'
import { maru } from '../maru'
import { omote } from '../omote'

export const toolbar = {
	base: 'flex items-center',
	orientation: {
		horizontal: 'flex-row flex-wrap gap-1',
		vertical: 'flex-col w-fit gap-1',
	},
	variant: {
		plain: '',
		outline: [kage.border, maru.rounded, 'p-1'],
		solid: [omote.tint, 'border border-transparent', maru.rounded, 'p-1'],
	},
	group: {
		base: 'flex items-center',
		orientation: {
			horizontal: 'flex-row gap-0.5',
			vertical: 'flex-col gap-0.5',
		},
	},
	defaults: { orientation: 'horizontal' as const, variant: 'plain' as const },
}
