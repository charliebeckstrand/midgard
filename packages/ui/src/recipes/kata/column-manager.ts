import { sen } from '../ryu/sen'

export const columnManager = {
	root: ['flex flex-col', 'gap-sm'],
	pin: [
		'inline-flex flex-none items-center justify-center',
		'px-3 -ml-3 -mr-3',
		'text-zinc-400 dark:text-zinc-500',
	],
	footer: ['flex items-center justify-end', 'gap-xs', 'pt-2', 'border-t', ...sen.borderSubtleColor],
}
