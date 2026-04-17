import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const drawer = {
	panel: {
		base: [
			omote.panel.chrome,
			narabi.panel.base,
			'fixed inset-x-0 bottom-0',
			'overflow-hidden',
			'w-full max-h-[85dvh]',
			'rounded-t-xl',
		],
		glass: {
			true: omote.glass,
			false: omote.panel.bg,
		},
	},
	title: [...narabi.panel.title, 'px-6 pt-6'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto overscroll-y-contain', 'px-6 last:mb-6'],
	close: ['absolute right-4 top-4', 'p-1', sumi.textMuted, ki.inset, maru.roundedMd],
}
