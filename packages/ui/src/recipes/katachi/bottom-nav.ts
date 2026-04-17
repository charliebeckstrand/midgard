import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { take } from '../take'

export const bottomNav = {
	base: [
		'fixed inset-x-0 bottom-0 z-40',
		'flex items-stretch justify-around',
		kage.divider,
		omote.surface,
	],
	item: [
		'group relative',
		'flex flex-1 flex-col items-center justify-center',
		'gap-0.5 py-3',
		'text-xs/4 font-medium',
		sumi.textMuted,
		ki.inset,
		take.iconSlot.md,
	],
	current: [sumi.text],
	indicator: [
		'inset-x-3 bottom-auto top-0',
		'h-0.5',
		maru.roundedFull,
		nuri.tabIndicator,
	],
}
