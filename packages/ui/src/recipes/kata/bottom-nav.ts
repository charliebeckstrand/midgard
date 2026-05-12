import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'
import { tabIndicator } from './tabs'

export const bottomNav = {
	base: [
		'sticky inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		sen.divider,
		omote.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'py-4',
		'gap-xs',
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		sen.focus.inset,
		...sawari.cursor,
	],
	current: [iro.text.default],
	indicator: ['inset-x-4 bottom-auto top-0', 'h-0.5', 'rounded-full', tabIndicator],
}

export { bottomNav as k }
