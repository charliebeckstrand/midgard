import { kage } from '../kage'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { sawari } from '../sawari'

export const alert = {
	base: ['flex w-fit gap-3 p-4 text-sm/5', maru.rounded],
	variant: {
		solid: {
			base: ['border border-transparent', kage.shadow],
			color: nuri.solid,
		},
		soft: {
			base: ['border border-transparent'],
			color: nuri.soft,
		},
		outline: {
			base: ['border'],
			color: nuri.outline,
		},
		plain: {
			base: ['border border-transparent'],
			color: nuri.text,
		},
	},
	icon: 'shrink-0',
	content: 'flex flex-col flex-1 gap-1 min-w-0',
	title: 'text-base/6 font-semibold',
	description: '',
	actions: 'mt-3 flex items-center gap-1',
	close: [maru.roundedMd, sawari.cursor, 'shrink-0 -m-1 p-1'],
	defaults: { variant: 'soft' as const, color: 'zinc' as const },
}
