import { maru } from '../maru'
import { sawari } from '../sawari'
import { sumi } from '../sumi'

export const toast = {
	viewport:
		'fixed z-[100] top-0 bottom-0 flex flex-col p-4 pointer-events-none max-sm:inset-x-0 max-sm:justify-end',
	scroll:
		'flex flex-col max-h-full overflow-y-auto overscroll-contain pointer-events-auto w-fit max-sm:w-full',
	position: {
		'top-right': 'justify-start right-0',
		'top-left': 'justify-start left-0',
		'bottom-right': 'justify-end right-0',
		'bottom-left': 'justify-end left-0',
	},
	card: [maru.rounded, 'w-80 max-sm:w-full p-4 flex items-center gap-3'],
	title: 'text-sm/5 font-semibold',
	description: 'text-sm/5 mt-1 opacity-90',
	actions: 'mt-3 flex items-center gap-1',
	close: [maru.roundedMd, sawari.cursor],
	type: {
		default: 'bg-blue-600 text-white',
		secondary: ['bg-zinc-100 dark:bg-zinc-800', sumi.text],
		success: 'bg-green-600 text-white',
		warning: 'bg-amber-500 text-amber-950',
		error: 'bg-red-600 text-white',
	},
	defaults: { position: 'bottom-right' as const, type: 'default' as const },
}
