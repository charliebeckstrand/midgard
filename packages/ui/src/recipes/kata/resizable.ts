import { defineRecipe, mode } from '../../core/recipe'
import { narabi } from '../kiso'

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
		base: ['relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none'],
		horizontal: 'px-2 cursor-col-resize',
		vertical: 'py-2 cursor-row-resize',
	},
	/** The grip that the handle draws as its `::after`, so the states of the grip are the states of the handle. */
	grip: {
		base: [
			'after:rounded-full',
			...mode(
				'after:bg-zinc-300 hover:after:bg-zinc-400',
				'dark:after:bg-zinc-600 dark:hover:after:bg-zinc-500',
			),
			'focus-visible:after:bg-blue-500 dark:focus-visible:after:bg-blue-500',
			'forced-colors:after:bg-[CanvasText]',
			// Each state color above outranks the shape, so the shape repeats in each state.
			'forced-colors:hover:after:bg-[CanvasText] forced-colors:focus-visible:after:bg-[CanvasText]',
			// Forced colors remove the focus color of the grip. This outline on the bar
			// marks the focused handle there, as `kiso/panel/grip.ts` FOCUS does.
			'forced-colors:focus-visible:after:outline-solid forced-colors:focus-visible:after:outline-2',
			'forced-colors:focus-visible:after:outline-offset-2 forced-colors:focus-visible:after:outline-[Highlight]',
		],
		horizontal: 'after:h-6 after:w-0.5',
		vertical: 'after:w-6 after:h-0.5',
	},
} as const
