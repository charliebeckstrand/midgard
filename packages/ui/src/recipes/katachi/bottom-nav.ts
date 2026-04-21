import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nuri } from '../nuri'
import { omote } from '../omote'
import { sen } from '../sen'

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
		kumi.gap.sm,
		ji.size.sm,
		iro.text.muted,
		iro.text.hover,
		'font-medium',
		ki.inset,
	],
	current: [iro.text.default],
	indicator: ['inset-x-4 bottom-auto top-0', 'h-0.5', maru.roundedFull, nuri.tabIndicator],
}
