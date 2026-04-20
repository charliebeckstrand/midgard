import { kage } from '../kage'
import { kumi } from '../kumi'
import { take } from '../take'

export const columnManager = {
	root: ['flex flex-col', take.gap.md],
	pin: [
		'inline-flex flex-none',
		kumi.center,
		'px-3 -ml-3 -mr-3',
		'text-zinc-400 dark:text-zinc-500',
	],
	footer: [
		'flex items-center justify-end',
		take.gap.sm,
		'pt-2',
		'border-t',
		...kage.borderSubtleColor,
	],
}
