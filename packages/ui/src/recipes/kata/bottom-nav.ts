import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { kumi } from '../ryu/kumi'
import { maru } from '../ryu/maru'
import { omote } from '../ryu/omote'
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
		'cursor-pointer',
		kumi.gap.sm,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		sen.focus.inset,
	],
	current: [iro.text.default],
	indicator: ['inset-x-4 bottom-auto top-0', 'h-0.5', maru.rounded.full, tabIndicator],
}
