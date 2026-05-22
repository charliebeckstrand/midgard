import { control } from '../genkei/control'
import { hannou, iro } from '../kiso'

const { surface, affix } = control

export const k = {
	surface,
	affix: {
		...affix,
		base: [
			'flex items-center min-w-0',
			'*:data-[slot=icon]:pointer-events-none',
			...iro.text.muted,
			...hannou.cursor,
		],
	},
}
