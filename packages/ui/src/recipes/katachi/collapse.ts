import { ki } from '../ki'
import { sumi } from '../sumi'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center gap-1 text-sm font-medium',
		sumi.textMuted,
		sumi.textHover,
		'group-data-[open]/collapse:text-zinc-950 dark:group-data-[open]/collapse:text-white',
		'group-data-[open]/collapse:cursor-pointer',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		ki.ring,
	],
	panel: 'overflow-hidden',
}
