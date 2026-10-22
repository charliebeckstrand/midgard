import { defineKata } from '../../core/recipe'
import { narabi, sen } from '../kiso'

const { flex } = narabi

// The root slot is the group. The `orientation` of the handle is the orientation
// of the group, which is the axis that the handle resizes.
export const k = defineKata({
	base: ['flex h-full w-full overflow-hidden'],
	orientation: { horizontal: 'flex-row', vertical: 'flex-col' },
	slots: {
		panel: 'relative overflow-hidden',
		/** The handle, and the grip that it draws as its `::after`, so the states of the grip are the states of the handle. */
		handle: {
			base: ['relative', flex.row, 'shrink-0 justify-center', 'outline-none touch-none', sen.grip],
			orientation: {
				horizontal: ['px-2 cursor-col-resize', 'after:h-6 after:w-0.5'],
				vertical: ['py-2 cursor-row-resize', 'after:w-6 after:h-0.5'],
			},
		},
	},
	defaults: { orientation: 'horizontal' },
})
