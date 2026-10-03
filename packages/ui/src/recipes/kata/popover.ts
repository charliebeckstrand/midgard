import { defineScale } from '../../core/density'
import { bridge } from '../katakana'
import { dan } from '../kiso/dan'
import { popover } from '../kiso/popover'

export const k = {
	...bridge.popover(popover, { text: ['text-pretty', popover.text] }),
	/** The padding of the panel at each step: `p-3`, `p-4`, and `p-6`. */
	padding: dan.space.popover,
}

/** The size scale of {@link PopoverContent}: the steps of its padding. */
export const scale = defineScale(dan.space.popover)
