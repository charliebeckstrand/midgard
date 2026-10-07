import { defineScale } from '../../core/density'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'

export const k = {
	trigger: popover.trigger,
	portal: popover.portal,
	text: ['text-pretty', popover.text],
	panel: popover.panel,
	/** The padding of the panel at each step: `p-3`, `p-4`, and `p-6`. */
	padding: dan.space.popover,
}

/** The size scale of {@link PopoverContent}: the steps of its padding. */
export const scale = defineScale(dan.space.popover)
