import { hannou, iro } from '../kiso'
import { control } from '../kiso/control'

const { cursor } = hannou
const { text } = iro
const { surface, affix } = control

export const k = {
	surface,
	affix: {
		...affix,
		base: [
			'flex items-center min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			...text.muted,
			...cursor,
		],
	},
}
