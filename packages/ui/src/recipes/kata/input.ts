import { control } from '../katakana'
import { iro } from '../kiso'

export const k = control({
	base: 'block',
	slots: {
		affix: [
			'flex items-center min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			...iro.text.muted,
		],
	},
})

export type { ControlVariants as InputVariants } from '../katakana'
