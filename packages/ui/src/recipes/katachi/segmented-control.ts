import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { omote } from '../omote'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const segmentedControl = {
	root: ['inline-flex items-center', maru.rounded, omote.tint],
	segment: [
		'relative z-10 flex items-center justify-center cursor-default outline-none',
		'font-medium select-none whitespace-nowrap',
		sumi.textMuted,
		ki.indicator,
		yasumi.disabled,
	],
	segmentCurrent: sumi.text,
	indicator: ['bg-white dark:bg-zinc-700', kage.shadow],
	size: {
		sm: { root: 'p-0.5 gap-0.5', segment: 'px-2.5 py-1 text-xs/4' },
		md: { root: 'p-1 gap-0.5', segment: 'px-3 py-1.5 text-sm/5' },
		lg: { root: 'p-1 gap-1', segment: 'px-4 py-2 text-base/6' },
	},
	defaults: { size: 'md' as const },
}
