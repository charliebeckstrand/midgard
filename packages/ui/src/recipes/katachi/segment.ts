import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { omote } from '../omote'
import { yasumi } from '../yasumi'

export const segment = {
	base: ['inline-flex items-center', maru.rounded, omote.tint],
	segment: [
		'flex items-center justify-center',
		'font-medium select-none whitespace-nowrap',
		maru.rounded,
		ki.indicator,
		ki.ring,
		yasumi.disabled,
		'cursor-default',
		'outline-none',
	],
	indicator: ['bg-white', 'dark:bg-zinc-600', kage.shadow],
	size: {
		sm: { base: 'p-0.5 gap-0.5', segment: 'px-2.5 py-1 text-xs/4' },
		md: { base: 'p-1 gap-0.5', segment: 'px-3 py-1.5 text-sm/5' },
		lg: { base: 'p-1 gap-1', segment: 'px-4 py-2 text-base/6' },
	},
	defaults: { size: 'md' as const },
}
