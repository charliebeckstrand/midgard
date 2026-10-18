import { defineRecipe, mode } from '../../core/recipe'
import { kasane, narabi, sen } from '../kiso'

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
			sen.forced.shape,
			// Each state color above outranks the shape, so the shape repeats in each state.
			'forced-colors:group-hover/handle:bg-[CanvasText] forced-colors:group-focus-visible/handle:bg-[CanvasText]',
			// Forced colors remove the focus color of the grip. This outline on the bar
			// marks the focused handle there, as `kiso/panel/grip.ts` FOCUS does.
			'forced-colors:group-focus-visible/handle:outline-solid forced-colors:group-focus-visible/handle:outline-2',
			'forced-colors:group-focus-visible/handle:outline-offset-2 forced-colors:group-focus-visible/handle:outline-[Highlight]',
		],
		horizontal: 'h-6 w-0.5',
		vertical: 'w-6 h-0.5',
	},
} as const
