import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'

export const inspector = {
	panel: {
		base: [omote.panel.bg, narabi.panel.base, 'relative h-full'],
		side: {
			right: ['border-l', kage.borderColor],
			left: ['border-r', kage.borderColor],
		},
		size: {
			sm: 'w-72',
			md: 'w-84',
			lg: 'w-96',
			xl: 'w-108',
		},
		defaults: { side: 'right' as const, size: 'md' as const },
	},
	header: 'flex items-center justify-between gap-2 px-6 pt-6',
	title: [...narabi.panel.title],
	description: [...narabi.panel.description],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'],
	close: [sumi.textMuted, ki.inset, maru.roundedMd, 'shrink-0', 'p-1'],
}
