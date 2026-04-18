import { ki } from '../ki'
import { sumi } from '../sumi'
import { take } from '../take'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		take.gap.sm,
		take.text.sm,
		sumi.textMuted,
		sumi.textHover,
		'font-medium',
		ki.ring,
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		'group-data-[open]/collapse:cursor-pointer',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	panel: 'overflow-hidden',
}
