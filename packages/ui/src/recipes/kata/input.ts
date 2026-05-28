import { control } from '../katakana'
import { iro } from '../kiso'

const { text } = iro

export const k = control({
	base: 'block',
	slots: {
		affix: ['flex items-center min-w-0', '*:data-[slot=icon]:pointer-events-none', ...text.muted],
	},
})

export type { ControlVariants as InputVariants } from '../katakana'
