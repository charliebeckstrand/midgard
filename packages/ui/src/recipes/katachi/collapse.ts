import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		kumi.gap.sm,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		ki.ring,
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		'group-data-[open]/collapse:cursor-pointer',
		'disabled:opacity-50 disabled:cursor-not-allowed',
	],
	panel: 'overflow-hidden',
}
