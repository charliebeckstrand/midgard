import { mode } from '../../core/recipe'
import { kasane, narabi } from '../kiso'

const { radius } = kasane
const { flex } = narabi

export const k = {
	group: 'flex h-full w-full overflow-hidden',
	panel: 'relative overflow-hidden',
	handle: ['group/handle relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none'],
	handleHorizontal: 'px-2 cursor-col-resize',
	handleVertical: 'py-2 cursor-row-resize',
	grip: [
		radius.rounded.full,
		...mode(
			'bg-zinc-300 group-hover/handle:bg-zinc-400',
			'dark:bg-zinc-600 dark:group-hover/handle:bg-zinc-500',
		),
		'group-focus-visible/handle:bg-blue-500 dark:group-focus-visible/handle:bg-blue-500',
	],
	gripDragging: '',
	gripHorizontal: 'h-6 w-0.5',
	gripVertical: 'w-6 h-0.5',
} as const
