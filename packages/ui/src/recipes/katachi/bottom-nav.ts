import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const bottomNav = {
	base: [
		'sticky inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		kage.divider,
		omote.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'py-4',
		take.gap.sm,
		take.text.sm,
		sumi.textMuted,
		sumi.textHover,
		'font-medium',
		ki.inset,
	],
	current: [sumi.text],
	indicator: ['inset-x-4 bottom-auto top-0', 'h-0.5', maru.roundedFull, nuri.tabIndicator],
}
