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
			sm: 'w-80',
			md: 'w-96',
			lg: 'w-[28rem]',
			xl: 'w-[32rem]',
		},
		defaults: { side: 'right' as const, size: 'md' as const },
	},
	title: [...narabi.panel.title, 'px-6 pt-6 pr-12'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'],
	close: [sumi.textMuted, ki.inset, maru.roundedMd, 'absolute right-4 top-4', 'p-1'],
}
