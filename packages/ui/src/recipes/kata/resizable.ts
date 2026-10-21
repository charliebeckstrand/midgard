import { defineRecipe } from '../../core/recipe'
import { narabi, sen } from '../kiso'

const { flex } = narabi

const group = defineRecipe({
	base: ['flex h-full w-full overflow-hidden'],
	orientation: { horizontal: 'flex-row', vertical: 'flex-col' },
	defaults: { orientation: 'horizontal' },
})

export const k = {
	group,
	panel: 'relative overflow-hidden',
	// The `orientation` tables of the handle and the grip are keyed by the
	// orientation of the group, which is the axis that the handle resizes.
	handle: {
		base: ['relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none'],
		orientation: {
			horizontal: 'px-2 cursor-col-resize',
			vertical: 'py-2 cursor-row-resize',
		},
	},
	/** The grip that the handle draws as its `::after`, so the states of the grip are the states of the handle. */
	grip: {
		base: sen.grip,
		orientation: {
			horizontal: 'after:h-6 after:w-0.5',
			vertical: 'after:w-6 after:h-0.5',
		},
	},
} as const
