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
			'fixed inset-x-0 bottom-0 w-full overflow-y-auto',
			'rounded-t-xl max-h-[85dvh]',
		],
		glass: {
			true: 'bg-transparent backdrop-blur-md',
			false: omote.panel.bg,
		},
	},
	title: [...narabi.panel.title, 'px-6 pt-6'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'],
	close: [sumi.textMuted, ki.inset, 'absolute right-4 top-4', maru.roundedMd, 'p-1'],
}
