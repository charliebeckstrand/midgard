import { defineRecipe, mode } from '../../core/recipe'
import { kasane, narabi } from '../kiso'

const { rounded } = kasane
const { flex } = narabi

const group = defineRecipe({
	base: ['flex h-full w-full overflow-hidden'],
	orientation: { horizontal: 'flex-row', vertical: 'flex-col' },
	defaults: { orientation: 'horizontal' },
})

export const k = {
	group,
	panel: 'relative overflow-hidden',
	handle: ['group/handle relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none'],
	handleHorizontal: 'px-2 cursor-col-resize',
	handleVertical: 'py-2 cursor-row-resize',
	grip: [
		rounded.full,
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
