import { ki } from '../ki'
import { maru } from '../maru'

export const resizable = {
	group: 'flex h-full w-full overflow-hidden',
	panel: 'relative overflow-hidden',
	handle: [
		'group/handle relative flex shrink-0 items-center justify-center',
		'outline-none touch-none',
		ki.ring,
	],
	handleHorizontal: 'w-3 cursor-col-resize',
	handleVertical: 'h-3 cursor-row-resize',
	grip: [
		maru.roundedFull,
		'transition-colors',
		'bg-zinc-300 group-hover/handle:bg-zinc-400',
		'dark:bg-zinc-600 dark:group-hover/handle:bg-zinc-500',
	],
	gripDragging: 'bg-blue-500 dark:bg-blue-500',
	gripHorizontal: 'h-6 w-0.5',
	gripVertical: 'w-6 h-0.5',
}
