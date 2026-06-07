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
			// The disabled input/button sits beside the affix, not inside it, so the
			// self/descendant variants in `cursor` never catch it — react to the
			// enclosing control frame instead.
			'group-has-[:disabled]/control:cursor-not-allowed group-has-[[data-disabled]]/control:cursor-not-allowed',
		],
	},
}
