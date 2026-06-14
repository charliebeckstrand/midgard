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
	handle: {
		base: ['group/handle relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none'],
		horizontal: 'px-2 cursor-col-resize',
		vertical: 'py-2 cursor-row-resize',
	},
	grip: {
		base: [
			rounded.full,
			...mode(
				'bg-zinc-300 group-hover/handle:bg-zinc-400',
				'dark:bg-zinc-600 dark:group-hover/handle:bg-zinc-500',
			),
			'group-focus-visible/handle:bg-blue-500 dark:group-focus-visible/handle:bg-blue-500',
		],
		dragging: '',
		horizontal: 'h-6 w-0.5',
		vertical: 'w-6 h-0.5',
	},
} as const
