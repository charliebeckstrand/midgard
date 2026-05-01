import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export const collapse = {
	base: 'group/collapse',
	trigger: [
		'inline-flex items-center',
		kumi.gap.sm,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		'group-data-[open]/collapse:text-zinc-950',
		'dark:group-data-[open]/collapse:text-white',
		sen.focus.ring,
		'disabled:opacity-50 disabled:cursor-not-allowed',
		...sawari.cursor,
	],
	panel: 'overflow-hidden',
}
