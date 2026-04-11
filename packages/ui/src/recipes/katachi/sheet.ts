import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const sheet = {
	panel: {
		base: [omote.panel.chrome, narabi.panel.base, 'fixed overflow-y-auto rounded-xl'],
		glass: {
			true: 'bg-transparent backdrop-blur-sm',
			false: omote.panel.bg,
		},
		side: {
			right: [
				'inset-y-0 right-0 w-full',
				'max-sm:rounded-r-none',
				'sm:top-4 sm:right-4 sm:bottom-4',
			],
			left: ['inset-y-0 left-0 w-full', 'max-sm:rounded-l-none', 'sm:top-4 sm:left-4 sm:bottom-4'],
			top: narabi.slide.top,
			bottom: narabi.slide.bottom,
		},
		size: take.panel,
		defaults: { side: 'right' as const, size: 'md' as const },
	},
	title: [...narabi.panel.title, 'px-6 pt-6'],
	description: [...narabi.panel.description, 'px-6'],
	actions: [narabi.panel.actions, 'px-6 pb-6'],
	body: [narabi.panel.body, 'flex-1 overflow-y-auto px-6'],
	close: [sumi.textMuted, ki.inset, 'absolute right-4 top-4', maru.roundedMd, 'p-1'],
}
