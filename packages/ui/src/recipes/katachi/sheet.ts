import { ki } from '../ki'
import { maru } from '../maru'
import { narabi } from '../narabi'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const sheet = {
	panel: {
		base: [
			omote.panel.chrome,
			'fixed flex flex-col overflow-y-auto rounded-xl',
			'max-sm:inset-x-0 max-sm:bottom-0 max-sm:w-full max-sm:max-h-full max-sm:min-h-[50svh] max-sm:rounded-b-none',
		],
		glass: {
			true: 'bg-transparent',
			false: omote.panel.bg,
		},
		side: {
			right: 'sm:top-4 sm:right-4 sm:bottom-4 sm:w-full',
			left: 'sm:top-4 sm:left-4 sm:bottom-4 sm:w-full',
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
	close: [sumi.textMuted, ki.offset, 'absolute right-4 top-4', maru.roundedMd, 'p-1'],
}
