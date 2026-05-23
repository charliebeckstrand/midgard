import { sen } from '../kiso'
export const k = {
	root: ['flex flex-col', 'gap-2'],
	pin: [
		'inline-flex flex-none items-center justify-center',
		'px-3 -ml-3 -mr-3',
		'text-zinc-500 dark:text-zinc-400',
	],
	footer: ['flex items-center justify-end', 'gap-1', 'pt-2', 'border-t', ...sen.borderSubtleColor],
}
