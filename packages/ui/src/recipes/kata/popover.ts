import { bridge } from '../katakana'
import { popover } from '../kiso/popover'

export const k = {
	...bridge.popover(popover, { text: ['text-pretty', popover.text] }),
	/** The padding of the panel at each step: `p-3`, `p-4`, and `p-6`. */
	padding: 'density-p-[3,4,6]',
}
