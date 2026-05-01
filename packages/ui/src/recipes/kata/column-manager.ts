import { kumi } from '../ryu/kumi'
import { sen } from '../ryu/sen'

export const columnManager = {
	root: ['flex flex-col', kumi.gap.md],
	pin: [
		'inline-flex flex-none',
		kumi.center,
		'px-3 -ml-3 -mr-3',
		'text-zinc-400 dark:text-zinc-500',
	],
	footer: [
		'flex items-center justify-end',
		kumi.gap.sm,
		'pt-2',
		'border-t',
		...sen.borderSubtleColor,
	],
}
