import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'

export const otpInput = {
	root: 'inline-flex items-center',
	gap: { sm: 'gap-1.5', md: 'gap-2', lg: 'gap-2.5' },
	cell: [
		sumi.text,
		kage.border,
		ki.ring,
		'bg-white dark:bg-white/5',
		'shadow-sm text-center font-medium',
		'hover:border-zinc-950/20 dark:hover:border-white/20',
		'disabled:opacity-50 disabled:cursor-not-allowed',
		'data-invalid:border-red-600',
	],
	size: {
		sm: ['size-8 text-sm/6', maru.roundedMd],
		md: ['size-10 text-base/6', maru.rounded],
		lg: ['size-12 text-lg/6', maru.rounded],
	},
	defaults: { size: 'md' as const },
}
